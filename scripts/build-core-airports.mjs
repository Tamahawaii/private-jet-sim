// Builds data/airports-core.json — a curated airport set for the game:
// large + medium airports, small airports with an IATA code, plus every ICAO
// referenced by game data (events, resorts, personas, starter fleet).
import { readFileSync, writeFileSync } from 'node:fs';

const csv = readFileSync('scripts/airports.csv', 'utf8').split('\n');
const header = parseLine(csv[0]);
const col = Object.fromEntries(header.map((h, i) => [h, i]));

function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const referenced = new Set(['PHNL', 'KJAC', 'KDAL', 'SULS', 'KPGA']);
for (const f of ['events', 'resorts', 'personas']) {
  const d = JSON.parse(readFileSync(`data/${f}.json`, 'utf8'));
  for (const x of d) {
    if (x.locationICAO) referenced.add(x.locationICAO);
    if (x.homeBaseICAO) referenced.add(x.homeBaseICAO);
  }
}

const rows = [];
for (let i = 1; i < csv.length; i++) {
  const line = csv[i]; if (!line.trim()) continue;
  const c = parseLine(line);
  const type = c[col.type];
  const icao = c[col.icao_code] || c[col.gps_code] || c[col.ident];
  const iata = c[col.iata_code];
  if (!icao || !/^[A-Z0-9]{3,4}$/.test(icao)) continue;
  const isBig = type === 'large_airport' || type === 'medium_airport';
  const ident = c[col.ident];
  const isIataSmall = type === 'small_airport' && iata && /^[A-Z]{3}$/.test(iata) && c[col.scheduled_service] === 'yes';
  const isRef = referenced.has(icao) || referenced.has(ident);
  if (!isBig && !isIataSmall && !isRef) continue;
  const lat = parseFloat(c[col.latitude_deg]); const lng = parseFloat(c[col.longitude_deg]);
  if (!isFinite(lat) || !isFinite(lng)) continue;
  const base = {
    icao, iata: iata || undefined,
    name: c[col.name].replace(/\s+Airport$/i, '').replace(/\s+International$/i, ' Intl'),
    city: (c[col.municipality] || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined,
    country: c[col.iso_country],
    lat: +lat.toFixed(4), lng: +lng.toFixed(4),
    size: type === 'large_airport' ? 'L' : type === 'medium_airport' ? 'M' : 'S',
    elev: c[col.elevation_ft] ? parseInt(c[col.elevation_ft], 10) : undefined,
  };
  rows.push(base);
  // Legacy identifiers still used by game data (e.g. KHTO -> KJPX)
  if (ident && ident !== icao && referenced.has(ident)) rows.push({ ...base, icao: ident, alias: icao });
}
// de-dupe by ICAO, preferring larger
const byIcao = new Map();
const rank = { L: 3, M: 2, S: 1 };
for (const r of rows) { const p = byIcao.get(r.icao); if (!p || rank[r.size] > rank[p.size]) byIcao.set(r.icao, r); }
const out = [...byIcao.values()].sort((a, b) => a.icao.localeCompare(b.icao));
const missing = [...referenced].filter(x => !byIcao.has(x));
writeFileSync('data/airports-core.json', JSON.stringify(out));
console.log(out.length, 'airports;', (readFileSync('data/airports-core.json').length / 1024).toFixed(0), 'KB; missing referenced:', missing);
