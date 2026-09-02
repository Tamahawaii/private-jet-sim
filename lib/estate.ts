/**
 * Yachts, marinas, voyages and residences (Phase 11). Timestamp-based like
 * flights: a voyage keeps moving while the app is closed; upkeep and charter
 * income are settled from the sim clock whenever the game is open.
 */
import { db } from './db';
import { useStore } from '../app/lib/store';
import { Yacht, Marina, Voyage, Residence, FlightRecap, HostedGathering, PersonaID } from '../types';
import yachtsData from '../data/yachts.json';
import marinasData from '../data/marinas.json';
import residencesData from '../data/residences.json';
import { calculateDistanceNM, computeGreatCirclePoints } from '../app/lib/math';
import { getAirport, shortCity } from './flight/airports';
import { recordPlayerRelationshipEvent } from './relationships/helpers';
import { sendProactiveDM } from './social/proactiveDm';
import { routes } from './routes';

const DAY = 86400000;
const MONTH = 30 * DAY;

export const MARINAS = marinasData as Marina[];
export function getMarina(id: string | undefined | null): Marina | undefined { return MARINAS.find(m => m.id === id); }

export function nearestMarina(lat: number, lng: number): Marina {
  let best = MARINAS[0], bd = Infinity;
  for (const m of MARINAS) { const d = calculateDistanceNM(lat, lng, m.lat, m.lng); if (d < bd) { bd = d; best = m; } }
  return best;
}

// ---------------------------------------------------------------- seeding

export async function seedEstate(): Promise<void> {
  const now = useStore.getState().getNow();
  if ((await db.marinas.count()) < MARINAS.length) await db.marinas.bulkPut(MARINAS);

  const existingYachts = new Set((await db.yachts.toArray()).map(y => y.id));
  const missingYachts = (yachtsData as Yacht[]).filter(y => !existingYachts.has(y.id)).map(y => {
    const m = nearestMarina(y.currentLocationLat, y.currentLocationLng);
    return { ...y, owned: false, status: 'docked' as const, currentMarinaId: m.id, currentLocationLat: m.lat, currentLocationLng: m.lng, currentLocationName: m.city, currentVoyageId: null, lastCostsAppliedAt: now };
  });
  if (missingYachts.length) await db.yachts.bulkAdd(missingYachts);
  // Artwork refresh
  for (const y of yachtsData as Yacht[]) { const cur = await db.yachts.get(y.id); if (cur && cur.imageUrl !== y.imageUrl) await db.yachts.update(y.id, { imageUrl: y.imageUrl }); }

  const existingRes = new Set((await db.residences.toArray()).map(r => r.id));
  const missingRes = (residencesData as Residence[]).filter(r => !existingRes.has(r.id)).map(r => ({
    ...r,
    owned: !!r.isPrimary, // Diamond Head House is the canonical starting estate
    acquiredAt: r.isPrimary ? new Date(now).toISOString() : undefined,
    lastCostsAppliedAt: now,
    hostedCount: 0,
  }));
  if (missingRes.length) await db.residences.bulkAdd(missingRes);
  for (const r of residencesData as Residence[]) { const cur = await db.residences.get(r.id); if (cur && cur.imageUrl !== r.imageUrl) await db.residences.update(r.id, { imageUrl: r.imageUrl }); }
}

// ---------------------------------------------------------------- yachts

export async function purchaseYacht(id: string): Promise<void> {
  const now = useStore.getState().getNow();
  await db.transaction('rw', [db.yachts, db.player, db.transactions], async () => {
    const y = await db.yachts.get(id); const player = await db.player.get('player');
    if (!y || !player) throw new Error('Missing yacht or player');
    if (y.owned) throw new Error('Already in your fleet');
    if (player.netWorth < y.acquisitionPrice) throw new Error('Insufficient funds');
    await db.player.update('player', { netWorth: player.netWorth - y.acquisitionPrice });
    await db.yachts.update(id, { owned: true, acquiredAt: new Date(now).toISOString(), lastCostsAppliedAt: now, charterOut: { enabled: false, lastPayoutAt: now, lifetimeIncome: 0 } });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'yacht_purchase', amount: -y.acquisitionPrice, description: `Acquired ${y.name} (${y.builder}, ${y.lengthMeters} m)`, relatedEntityId: id });
  });
}

export async function sellYacht(id: string): Promise<number> {
  const now = useStore.getState().getNow();
  let proceeds = 0;
  await db.transaction('rw', [db.yachts, db.player, db.transactions], async () => {
    const y = await db.yachts.get(id); const player = await db.player.get('player');
    if (!y || !player || !y.owned) throw new Error('Not yours to sell');
    if (y.status !== 'docked') throw new Error('Bring her into port first');
    proceeds = Math.round(y.acquisitionPrice * 0.72);
    await db.player.update('player', { netWorth: player.netWorth + proceeds });
    await db.yachts.update(id, { owned: false, acquiredAt: undefined, charterOut: undefined });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'yacht_sale', amount: proceeds, description: `Sold ${y.name}`, relatedEntityId: id });
  });
  return proceeds;
}

export function voyageBriefing(y: Yacht, from: Marina, to: Marina) {
  const distanceNM = calculateDistanceNM(from.lat, from.lng, to.lat, to.lng);
  const hours = distanceNM / Math.max(8, y.cruisingSpeedKnots);
  const fuel = distanceNM * y.fuelCostPerNm;
  const crew = hours * (y.crewSize * 45);
  const docking = to.tier * 6000;
  const totalCost = Math.round(fuel + crew + docking);
  const waypoints = computeGreatCirclePoints(from.lat, from.lng, to.lat, to.lng, 64).map(p => ({ lng: p[0], lat: p[1] }));
  return { distanceNM, hours, totalCost, breakdown: { fuel, crew, docking }, waypoints, sameBasin: from.basin === to.basin };
}

export async function launchVoyage(params: { yachtId: string; toMarinaId: string; guests: PersonaID[] }): Promise<string> {
  const now = useStore.getState().getNow();
  let id = '';
  await db.transaction('rw', [db.yachts, db.yachtVoyages, db.player, db.transactions], async () => {
    const y = await db.yachts.get(params.yachtId); const player = await db.player.get('player');
    if (!y || !player || !y.owned) throw new Error('Yacht unavailable');
    if (y.status !== 'docked') throw new Error('She is already under way');
    const from = getMarina(y.currentMarinaId) || nearestMarina(y.currentLocationLat, y.currentLocationLng);
    const to = getMarina(params.toMarinaId);
    if (!to) throw new Error('Unknown marina');
    const brief = voyageBriefing(y, from, to);
    if (player.netWorth < brief.totalCost) throw new Error('Insufficient funds');
    id = crypto.randomUUID();
    await db.yachtVoyages.add({ id, yachtId: y.id, originMarinaId: from.id, destinationMarinaId: to.id, departedAt: now, estimatedArrivalAt: now + brief.hours * 3600000, arrivedAt: null, distanceNM: brief.distanceNM, costUSD: brief.totalCost, waypoints: brief.waypoints, guests: params.guests, momentsFired: [] });
    await db.yachts.update(y.id, { status: 'cruising', currentVoyageId: id });
    await db.player.update('player', { netWorth: player.netWorth - brief.totalCost });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'voyage_cost', amount: -brief.totalCost, description: `${y.name} · ${from.city} → ${to.city}`, relatedEntityId: id });
  });
  return id;
}

export async function resolveVoyages(): Promise<Voyage[]> {
  const now = useStore.getState().getNow();
  const due = await db.yachtVoyages.filter(v => v.arrivedAt === null && v.estimatedArrivalAt <= now).toArray();
  for (const v of due) {
    const to = getMarina(v.destinationMarinaId);
    const y = await db.yachts.get(v.yachtId);
    if (!to || !y) continue;
    const prior = await db.yachtVoyages.filter(x => x.id !== v.id && x.arrivedAt !== null).count();
    const breakdown = [{ label: `${Math.round(v.distanceNM).toLocaleString()} NM at sea`, points: 6 + Math.min(30, Math.round(v.distanceNM / 120)) }, { label: `Arriving at ${to.name}`, points: to.tier * 4 }];
    if (v.guests.length) breakdown.push({ label: `${v.guests.length} guest${v.guests.length > 1 ? 's' : ''} aboard`, points: Math.min(4, v.guests.length) * 7 });
    if (y.lengthMeters >= 100) breakdown.push({ label: `${y.lengthMeters} metres of ${y.builder}`, points: 12 });
    const recap: FlightRecap = { prestigeGained: breakdown.reduce((s, b) => s + b.points, 0), breakdown, newCountry: false, countryName: to.country, firstVisit: true, flightNumber: prior + 1, companions: v.guests, arrivedLocalTime: '', hoursAloft: (v.estimatedArrivalAt - v.departedAt) / 3600000, purposeLabel: to.name };
    await db.transaction('rw', [db.yachtVoyages, db.yachts, db.player, db.notifications, db.personaState], async () => {
      await db.yachtVoyages.update(v.id, { arrivedAt: v.estimatedArrivalAt, recap });
      await db.yachts.update(y.id, { status: 'docked', currentVoyageId: null, currentMarinaId: to.id, currentLocationLat: to.lat, currentLocationLng: to.lng, currentLocationName: to.city });
      const player = await db.player.get('player');
      if (player) await db.player.update('player', { prestigeScore: (player.prestigeScore || 0) + recap.prestigeGained, currentLocationICAO: to.nearestAirportICAO });
      const apt = getAirport(to.nearestAirportICAO);
      for (const pid of v.guests) {
        const st = await db.personaState.where('personaId').equals(pid).first();
        if (st) await db.personaState.update(pid, { currentLocationICAO: to.nearestAirportICAO, currentCoords: apt ? { lat: apt.lat, lng: apt.lng, name: apt.name } : st.currentCoords });
      }
      await db.notifications.add({ id: crypto.randomUUID(), type: 'flight_arrival', title: `${y.name} moored at ${to.name}`, body: `Anchor down in ${to.city}. +${recap.prestigeGained} prestige.`, createdAt: new Date(now).toISOString(), readAt: null, linkTo: routes.yacht(y.id) });
    });
    for (const pid of v.guests) await recordPlayerRelationshipEvent(pid, 'shared-resort-stay', `${y.name}: ${getMarina(v.originMarinaId)?.city || '?'} → ${to.city}`, undefined, undefined, new Date(v.estimatedArrivalAt).toISOString()).catch(() => {});
    if (v.guests.length) {
      const pid = v.guests[Math.floor(Math.random() * v.guests.length)];
      sendProactiveDM(pid, `You just spent ${Math.round(recap.hoursAloft)} hours aboard the player's yacht ${y.name}, now moored in ${to.city}. Text them about the crossing or what to do tonight in ${to.city}.`, { trigger: 'reaction', relatedId: v.id, fallback: `Still swaying. ${to.city} tonight — I know a place on the water.` }).catch(() => {});
    }
  }
  return due;
}

export async function setYachtCharter(id: string, enabled: boolean): Promise<void> {
  const now = useStore.getState().getNow();
  await settleYachtCharter();
  const y = await db.yachts.get(id);
  if (!y?.owned) return;
  await db.yachts.update(id, { charterOut: { enabled, lastPayoutAt: now, lifetimeIncome: y.charterOut?.lifetimeIncome || 0 } });
}

export async function settleYachtCharter(): Promise<void> {
  const now = useStore.getState().getNow();
  for (const y of await db.yachts.filter(x => !!x.owned).toArray()) {
    const c = y.charterOut;
    if (!c?.enabled || y.status !== 'docked') { if (c && c.lastPayoutAt < now) await db.yachts.update(y.id, { charterOut: { ...c, lastPayoutAt: now } }); continue; }
    const weeks = (now - c.lastPayoutAt) / (7 * DAY);
    if (weeks < 0.1) continue;
    const net = Math.round(weeks * y.charterRatePerWeek * 0.55 * 0.7); // 55% utilisation, 30% to the brokerage/crew
    await db.transaction('rw', [db.yachts, db.player, db.transactions], async () => {
      const player = await db.player.get('player'); if (!player) return;
      await db.player.update('player', { netWorth: player.netWorth + net });
      await db.yachts.update(y.id, { charterOut: { ...c, lastPayoutAt: now, lifetimeIncome: c.lifetimeIncome + net } });
      await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'yacht_charter_income', amount: net, description: `Charter revenue · ${y.name}`, relatedEntityId: y.id });
    });
  }
}

// ---------------------------------------------------------------- residences

export async function purchaseResidence(id: string): Promise<void> {
  const now = useStore.getState().getNow();
  await db.transaction('rw', [db.residences, db.player, db.transactions], async () => {
    const r = await db.residences.get(id); const player = await db.player.get('player');
    if (!r || !player) throw new Error('Missing residence or player');
    if (r.owned) throw new Error('Already yours');
    if (player.netWorth < r.acquisitionPrice) throw new Error('Insufficient funds');
    await db.player.update('player', { netWorth: player.netWorth - r.acquisitionPrice });
    await db.residences.update(id, { owned: true, acquiredAt: new Date(now).toISOString(), lastCostsAppliedAt: now, currentValuation: r.acquisitionPrice });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'residence_purchase', amount: -r.acquisitionPrice, description: `Acquired ${r.name}, ${r.city}`, relatedEntityId: id });
  });
}

export async function sellResidence(id: string): Promise<number> {
  const now = useStore.getState().getNow();
  let proceeds = 0;
  await db.transaction('rw', [db.residences, db.player, db.transactions], async () => {
    const r = await db.residences.get(id); const player = await db.player.get('player');
    if (!r || !player || !r.owned) throw new Error('Not yours to sell');
    if (r.isPrimary) throw new Error('Your primary residence stays');
    proceeds = Math.round(r.currentValuation * 0.94);
    await db.player.update('player', { netWorth: player.netWorth + proceeds });
    await db.residences.update(id, { owned: false, acquiredAt: undefined });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'residence_sale', amount: proceeds, description: `Sold ${r.name}`, relatedEntityId: id });
  });
  return proceeds;
}

export const GATHERINGS = {
  dinner: { label: 'Dinner party', cost: 85000, prestige: 12, maxGuests: 8, note: 'Twelve courses, one long table, the good candles.' },
  weekend: { label: 'House weekend', cost: 260000, prestige: 26, maxGuests: 12, note: 'Friday to Sunday. Nobody leaves early.' },
  party: { label: 'The party', cost: 900000, prestige: 55, maxGuests: 40, note: 'A DJ flown in, fireworks from a barge, the column writes itself.' },
} as const;

export async function hostGathering(residenceId: string, kind: keyof typeof GATHERINGS, guestIds: PersonaID[]): Promise<HostedGathering> {
  const now = useStore.getState().getNow();
  const spec = GATHERINGS[kind];
  const r = await db.residences.get(residenceId); const player = await db.player.get('player');
  if (!r || !player || !r.owned) throw new Error('Host at a home you own');
  if (player.netWorth < spec.cost) throw new Error('Insufficient funds');
  const prestige = spec.prestige + Math.min(6, guestIds.length) * 3;
  const g: HostedGathering = { id: crypto.randomUUID(), residenceId, kind, at: new Date(now).toISOString(), guestIds, cost: spec.cost, prestigeGained: prestige };
  await db.transaction('rw', [db.gatherings, db.residences, db.player, db.transactions, db.personaState], async () => {
    await db.gatherings.add(g);
    await db.residences.update(residenceId, { hostedCount: (r.hostedCount || 0) + 1, lastVisitedAt: g.at });
    await db.player.update('player', { netWorth: player.netWorth - spec.cost, prestigeScore: (player.prestigeScore || 0) + prestige });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: g.at, type: 'hosting', amount: -spec.cost, description: `${spec.label} at ${r.name}`, relatedEntityId: g.id });
    const apt = getAirport(r.nearestAirportICAO);
    for (const pid of guestIds) {
      const st = await db.personaState.where('personaId').equals(pid).first();
      if (st) await db.personaState.update(pid, { currentLocationICAO: r.nearestAirportICAO, currentCoords: apt ? { lat: apt.lat, lng: apt.lng, name: apt.name } : st.currentCoords });
    }
  });
  for (const pid of guestIds) await recordPlayerRelationshipEvent(pid, 'shared-event', `${spec.label} at ${r.name}`, undefined, undefined, g.at).catch(() => {});
  await db.notifications.add({ id: crypto.randomUUID(), type: 'friend_action', title: `${spec.label} at ${r.name}`, body: guestIds.length ? `${guestIds.length} from your circle came. +${prestige} prestige, and the column will hear about it.` : `Nobody from your circle was in ${r.city}, but the house looked its best. +${prestige} prestige.`, createdAt: g.at, readAt: null, linkTo: `/residences/detail?id=${r.id}` }).catch(() => {});
  if (guestIds.length) {
    const pid = guestIds[Math.floor(Math.random() * guestIds.length)];
    sendProactiveDM(pid, `You were a guest at the player's ${spec.label.toLowerCase()} at ${r.name} in ${r.city} last night. Text them the morning after — one detail you loved, or gossip about another guest.`, { trigger: 'reaction', relatedId: g.id, fallback: `Last night at ${r.name}… I'm not recovered. Same time next month.`, cooldownMs: 0 }).catch(() => {});
  }
  return g;
}

/** Monthly upkeep for owned yachts and residences, plus slow appreciation on property. */
export async function settleUpkeep(): Promise<void> {
  const now = useStore.getState().getNow();
  const player = await db.player.get('player'); if (!player) return;
  let delta = 0; const lines: { type: 'yacht_upkeep' | 'residence_upkeep'; amount: number; description: string; id: string }[] = [];
  for (const y of await db.yachts.filter(x => !!x.owned).toArray()) {
    const last = y.lastCostsAppliedAt || now; const months = Math.floor((now - last) / MONTH);
    if (months < 1) continue;
    const cost = Math.round((y.annualOperatingCost / 12) * months);
    delta -= cost; lines.push({ type: 'yacht_upkeep', amount: -cost, description: `${y.name} · crew, berth, upkeep (${months} mo)`, id: y.id });
    await db.yachts.update(y.id, { lastCostsAppliedAt: last + months * MONTH });
  }
  for (const r of await db.residences.filter(x => !!x.owned).toArray()) {
    const last = r.lastCostsAppliedAt || now; const months = Math.floor((now - last) / MONTH);
    if (months < 1) continue;
    const cost = Math.round(((r.annualPropertyTax + r.annualMaintenanceCost + r.annualInsurance) / 12) * months);
    delta -= cost; lines.push({ type: 'residence_upkeep', amount: -cost, description: `${r.name} · tax, staff, upkeep (${months} mo)`, id: r.id });
    await db.residences.update(r.id, { lastCostsAppliedAt: last + months * MONTH, currentValuation: Math.round(r.currentValuation * Math.pow(1.04, months / 12)) });
  }
  if (lines.length === 0) return;
  await db.transaction('rw', [db.player, db.transactions], async () => {
    const p = await db.player.get('player'); if (!p) return;
    await db.player.update('player', { netWorth: p.netWorth + delta });
    for (const l of lines) await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: l.type, amount: l.amount, description: l.description, relatedEntityId: l.id });
  });
}

export function marinaCity(m: Marina | undefined): string { return m ? m.city : ''; }
export function marinaAirportCity(m: Marina): string { return shortCity(getAirport(m.nearestAirportICAO), m.city); }
