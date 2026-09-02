import { Flight, Player } from '../../types';
import { getAirport, countryName, AirportRecord } from './airports';

export interface VisitedAirport {
  icao: string;
  airport: AirportRecord | undefined;
  visits: number;
  firstAt: number;
  lastAt: number;
}

export interface VisitedCountry {
  iso: string;
  name: string;
  firstAt: number;
  visits: number;
  isHome: boolean;
}

export interface TravelLog {
  completed: Flight[];             // arrived flights, newest first
  totalFlights: number;
  totalNM: number;
  totalHours: number;
  totalSpend: number;
  airports: VisitedAirport[];       // most visited first
  countries: VisitedCountry[];      // first visit order
  longest?: Flight;
  routes: { from: [number, number]; to: [number, number]; waypoints: [number, number][] }[];
}

export function computeTravelLog(flights: Flight[], player?: Pick<Player, 'homeBaseICAO'> | null): TravelLog {
  const completed = flights.filter(f => f.arrivedAt !== null).sort((a, b) => (b.arrivedAt || 0) - (a.arrivedAt || 0));
  const airports = new Map<string, VisitedAirport>();
  const countries = new Map<string, VisitedCountry>();

  const home = getAirport(player?.homeBaseICAO);
  if (home) {
    countries.set(home.country, { iso: home.country, name: countryName(home.country), firstAt: 0, visits: 1, isHome: true });
    airports.set(home.icao, { icao: home.icao, airport: home, visits: 1, firstAt: 0, lastAt: 0 });
  }

  let totalNM = 0, totalHours = 0, totalSpend = 0;
  let longest: Flight | undefined;
  for (const f of [...completed].reverse()) {
    totalNM += f.distanceNM;
    totalHours += (f.estimatedArrivalAt - f.departedAt) / 3600000;
    totalSpend += f.costUSD;
    if (!longest || f.distanceNM > longest.distanceNM) longest = f;
    const at = f.arrivedAt || f.estimatedArrivalAt;
    const dest = getAirport(f.destinationICAO);
    const a = airports.get(f.destinationICAO);
    if (a) { a.visits++; a.lastAt = at; } else airports.set(f.destinationICAO, { icao: f.destinationICAO, airport: dest, visits: 1, firstAt: at, lastAt: at });
    if (dest) {
      const c = countries.get(dest.country);
      if (c) c.visits++; else countries.set(dest.country, { iso: dest.country, name: countryName(dest.country), firstAt: at, visits: 1, isHome: false });
    }
  }

  const routes = completed.slice(0, 60).map(f => ({
    from: [f.waypoints[0]?.lng ?? 0, f.waypoints[0]?.lat ?? 0] as [number, number],
    to: [f.waypoints[f.waypoints.length - 1]?.lng ?? 0, f.waypoints[f.waypoints.length - 1]?.lat ?? 0] as [number, number],
    waypoints: f.waypoints.map(w => [w.lng, w.lat] as [number, number]),
  }));

  return {
    completed,
    totalFlights: completed.length,
    totalNM,
    totalHours,
    totalSpend,
    airports: [...airports.values()].sort((x, y) => y.visits - x.visits || y.lastAt - x.lastAt),
    countries: [...countries.values()].sort((x, y) => x.firstAt - y.firstAt),
    longest,
    routes,
  };
}
