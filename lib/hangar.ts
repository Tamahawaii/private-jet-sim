/**
 * Hangar systems: upgrade modules, the charter program (income while parked)
 * and maintenance. Everything is timestamp-based on the sim clock so it keeps
 * working while the app is closed.
 */
import { db } from './db';
import { useStore } from '../app/lib/store';
import { Aircraft, ModuleCatalogItem, AircraftModule } from '../types';
import modulesData from '../data/modules.json';
import { catalogFor } from '../app/lib/mockData';

export const MODULE_CATALOG = modulesData as ModuleCatalogItem[];

export const MAINTENANCE_INTERVAL_HOURS = 400;
export const MAINTENANCE_DURATION_MS = 36 * 3600 * 1000;

const HOUR = 3600 * 1000;

/** Base specs come from the catalog; effective specs apply installed module bonuses. */
export function baseSpecsFor(a: Aircraft): { speedKnots: number; rangeNM: number; fuelBurnGPH: number } {
  if (a.baseSpecs) return a.baseSpecs;
  const c = catalogFor(a);
  return c ? { speedKnots: c.speedKnots, rangeNM: c.rangeNM, fuelBurnGPH: c.fuelBurnGPH } : { speedKnots: a.speedKnots, rangeNM: a.rangeNM, fuelBurnGPH: a.fuelBurnGPH };
}

export function effectiveSpecs(base: { speedKnots: number; rangeNM: number; fuelBurnGPH: number }, modules: AircraftModule[]) {
  const range = modules.reduce((s, m) => s + (m.effect.rangeBonus || 0), 0);
  const speed = modules.reduce((s, m) => s + (m.effect.speedBonus || 0), 0);
  return {
    speedKnots: Math.round(base.speedKnots * (1 + speed)),
    rangeNM: Math.round(base.rangeNM * (1 + range)),
    fuelBurnGPH: base.fuelBurnGPH,
  };
}

export function modulePrestige(a: Pick<Aircraft, 'modules'>): number {
  return (a.modules || []).reduce((s, m) => s + (m.effect.prestigeBonus || 0), 0);
}

export function moduleMonthlyCost(a: Pick<Aircraft, 'modules'>): number {
  return (a.modules || []).reduce((s, m) => s + (m.effect.monthlyCost || 0), 0);
}

export async function installModule(tailNumber: string, moduleId: string): Promise<void> {
  const item = MODULE_CATALOG.find(m => m.id === moduleId);
  if (!item) throw new Error('Unknown module');
  const now = useStore.getState().getNow();
  await db.transaction('rw', [db.aircraft, db.player, db.transactions], async () => {
    const a = await db.aircraft.get(tailNumber);
    const player = await db.player.get('player');
    if (!a || !player) throw new Error('Aircraft or player missing');
    if (a.status !== 'parked') throw new Error('Aircraft must be parked in a hangar');
    const slots = (a.cabinConfig || []).length || 2;
    if ((a.modules || []).length >= slots) throw new Error(`All ${slots} module slots are in use`);
    if ((a.modules || []).some(m => m.id === moduleId)) throw new Error('Already installed');
    if (player.netWorth < item.price) throw new Error('Insufficient funds');
    const base = baseSpecsFor(a);
    const modules: AircraftModule[] = [...(a.modules || []), { id: item.id, name: item.name, installedAt: new Date(now).toISOString(), effect: { ...item.effect, monthlyCost: item.monthlyCost } }];
    const eff = effectiveSpecs(base, modules);
    await db.aircraft.update(tailNumber, { modules, baseSpecs: base, ...eff });
    await db.player.update('player', { netWorth: player.netWorth - item.price });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'module_install', amount: -item.price, description: `${item.name} installed on ${tailNumber}`, relatedEntityId: tailNumber });
  });
}

export async function removeModule(tailNumber: string, moduleId: string): Promise<void> {
  const now = useStore.getState().getNow();
  await db.transaction('rw', [db.aircraft, db.player, db.transactions], async () => {
    const a = await db.aircraft.get(tailNumber);
    const player = await db.player.get('player');
    if (!a || !player) return;
    const item = MODULE_CATALOG.find(m => m.id === moduleId);
    const modules = (a.modules || []).filter(m => m.id !== moduleId);
    const base = baseSpecsFor(a);
    const refund = Math.round((item?.price || 0) * 0.4);
    await db.aircraft.update(tailNumber, { modules, baseSpecs: base, ...effectiveSpecs(base, modules) });
    await db.player.update('player', { netWorth: player.netWorth + refund });
    if (item) await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'module_install', amount: refund, description: `${item.name} removed from ${tailNumber} (resale)`, relatedEntityId: tailNumber });
  });
}

// ---------------------------------------------------------------- charter program

export function charterRateFor(a: Aircraft): number {
  const c = catalogFor(a);
  const cat = c?.category || 'midsize';
  const base = { light: 6500, midsize: 9500, heavy: 14500, airliner: 24000, helicopter: 4200 }[cat] || 9000;
  return Math.round(base * (1 + modulePrestige(a) * 0.02));
}

export async function setCharter(tailNumber: string, enabled: boolean): Promise<void> {
  const now = useStore.getState().getNow();
  const a = await db.aircraft.get(tailNumber);
  if (!a) return;
  if (enabled) {
    const prev = a.charter;
    await db.aircraft.update(tailNumber, { charter: { enabled: true, ratePerHour: charterRateFor(a), utilization: 0.32, since: now, lastPayoutAt: now, lifetimeIncome: prev?.lifetimeIncome || 0, lifetimeHours: prev?.lifetimeHours || 0 } });
  } else {
    await settleCharter();
    const fresh = await db.aircraft.get(tailNumber);
    if (fresh?.charter) await db.aircraft.update(tailNumber, { charter: { ...fresh.charter, enabled: false } });
  }
}

/** Credits charter income accrued since the last payout (called on boot and periodically). */
export async function settleCharter(): Promise<number> {
  const now = useStore.getState().getNow();
  const fleet = await db.aircraft.toArray();
  let total = 0;
  for (const a of fleet) {
    const ch = a.charter;
    if (!ch?.enabled || a.status !== 'parked') { if (ch && a.status !== 'parked' && ch.lastPayoutAt < now) await db.aircraft.update(a.tailNumber, { charter: { ...ch, lastPayoutAt: now } }); continue; }
    const elapsedH = (now - ch.lastPayoutAt) / HOUR;
    if (elapsedH < 1) continue;
    const bookedH = elapsedH * ch.utilization;
    const gross = bookedH * ch.ratePerHour;
    const operating = bookedH * (a.fuelBurnGPH * 6.5 + 800 + 450); // fuel, crew, wear
    const net = Math.round(gross - operating);
    total += net;
    await db.transaction('rw', [db.aircraft, db.player, db.transactions], async () => {
      const player = await db.player.get('player');
      if (!player) return;
      await db.player.update('player', { netWorth: player.netWorth + net });
      await db.aircraft.update(a.tailNumber, {
        charter: { ...ch, lastPayoutAt: now, lifetimeIncome: ch.lifetimeIncome + net, lifetimeHours: ch.lifetimeHours + bookedH },
        hoursFlown: (a.hoursFlown || 0) + bookedH,
        hoursSinceLastMaintenance: (a.hoursSinceLastMaintenance || 0) + bookedH,
      });
      if (net !== 0) await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'charter_income', amount: net, description: `Charter revenue · ${a.tailNumber} (${bookedH.toFixed(1)} h)`, relatedEntityId: a.tailNumber });
    });
    if (net >= 50000) await db.notifications.add({ id: crypto.randomUUID(), type: 'system', title: `Charter payout · ${a.tailNumber}`, body: `${bookedH.toFixed(1)} charter hours on the ${a.model} netted $${Math.round(net).toLocaleString()}.`, createdAt: new Date(now).toISOString(), readAt: null, linkTo: `/fleet/detail?tail=${a.tailNumber}` }).catch(() => {});
  }
  return total;
}

// ---------------------------------------------------------------- maintenance

export function maintenanceDue(a: Aircraft): boolean {
  return (a.hoursSinceLastMaintenance || 0) >= MAINTENANCE_INTERVAL_HOURS;
}

export function maintenanceCost(a: Aircraft): number {
  return Math.round(Math.max(45000, a.purchasePrice * 0.004));
}

export async function scheduleMaintenance(tailNumber: string): Promise<void> {
  const now = useStore.getState().getNow();
  await db.transaction('rw', [db.aircraft, db.player, db.transactions], async () => {
    const a = await db.aircraft.get(tailNumber);
    const player = await db.player.get('player');
    if (!a || !player) return;
    if (a.status !== 'parked') throw new Error('Aircraft must be parked');
    const cost = maintenanceCost(a);
    if (player.netWorth < cost) throw new Error('Insufficient funds');
    await db.aircraft.update(tailNumber, { status: 'maintenance', maintenanceUntil: now + MAINTENANCE_DURATION_MS });
    await db.player.update('player', { netWorth: player.netWorth - cost });
    await db.transactions.add({ id: crypto.randomUUID(), occurredAt: new Date(now).toISOString(), type: 'maintenance', amount: -cost, description: `Scheduled inspection · ${tailNumber}`, relatedEntityId: tailNumber });
  });
}

/** Releases aircraft whose maintenance window has passed. */
export async function settleMaintenance(): Promise<void> {
  const now = useStore.getState().getNow();
  const inShop = await db.aircraft.where('status').equals('maintenance').toArray();
  for (const a of inShop) {
    if (a.maintenanceUntil && a.maintenanceUntil <= now) {
      await db.aircraft.update(a.tailNumber, { status: 'parked', maintenanceUntil: null, hoursSinceLastMaintenance: 0 });
      await db.notifications.add({ id: crypto.randomUUID(), type: 'system', title: `${a.tailNumber} back on the line`, body: `${a.model} cleared inspection and is ready to fly.`, createdAt: new Date(now).toISOString(), readAt: null, linkTo: `/fleet/detail?tail=${a.tailNumber}` });
    }
  }
}
