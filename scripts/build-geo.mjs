// Generates lightweight GeoJSON land/country outlines used as the globe's
// instant-draw base layer (renders before raster tiles arrive, and offline).
import { readFileSync, writeFileSync } from 'node:fs';
import * as topojson from 'topojson-client';

const land110 = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const countries110 = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
const land50 = JSON.parse(readFileSync('node_modules/world-atlas/land-50m.json', 'utf8'));

const round = (geo, p = 2) => {
  const f = (c) => Array.isArray(c[0]) ? c.map(f) : [+c[0].toFixed(p), +c[1].toFixed(p)];
  for (const feat of geo.features) feat.geometry.coordinates = f(feat.geometry.coordinates);
  return geo;
};

const land = round(topojson.feature(land110, land110.objects.land), 2);
writeFileSync('public/geo/land-110m.json', JSON.stringify(land));

const borders = topojson.mesh(countries110, countries110.objects.countries, (a, b) => a !== b);
const bordersGeo = round({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: borders }] }, 2);
writeFileSync('public/geo/borders-110m.json', JSON.stringify(bordersGeo));

const land50geo = round(topojson.feature(land50, land50.objects.land), 2);
writeFileSync('public/geo/land-50m.json', JSON.stringify(land50geo));

for (const f of ['land-110m', 'borders-110m', 'land-50m']) {
  const s = readFileSync(`public/geo/${f}.json`).length;
  console.log(f, (s / 1024).toFixed(0) + ' KB');
}
