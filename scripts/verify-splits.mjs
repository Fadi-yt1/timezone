// Checks the county-to-zone assignment that drives the two-tone split states,
// against cities whose zone is known. Finds the county containing each city and
// compares its assigned zone with the expected one.
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';

const topo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'node_modules/us-atlas/counties-10m.json'), 'utf8'),
);
const assignment = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts/county-zones.json'), 'utf8'),
);

// city, lon, lat, the zone it really keeps
const CASES = [
  ['ND', 'Dickinson',      -102.79, 46.88, 'mountain'],
  ['ND', 'Minot',          -101.30, 48.23, 'central'],
  ['ND', 'Fargo',           -96.79, 46.88, 'central'],
  ['OR', 'Ontario',        -116.96, 44.03, 'mountain'],
  ['OR', 'Pendleton',      -118.79, 45.67, 'pacific'],
  ['OR', 'Portland',       -122.67, 45.52, 'pacific'],
  ['ID', 'Coeur d’Alene', -116.78, 47.68, 'pacific'],
  ['ID', 'Wallace',        -115.93, 47.47, 'pacific'],
  ['ID', 'Boise',          -116.20, 43.61, 'mountain'],
  ['TX', 'El Paso',        -106.49, 31.76, 'mountain'],
  ['TX', 'Dallas',          -96.80, 32.78, 'central'],
  ['FL', 'Pensacola',       -87.22, 30.42, 'central'],
  ['FL', 'Tallahassee',     -84.28, 30.44, 'eastern'],
  ['FL', 'Miami',           -80.19, 25.76, 'eastern'],
  ['TN', 'Knoxville',       -83.92, 35.96, 'eastern'],
  ['TN', 'Nashville',       -86.78, 36.16, 'central'],
  ['KY', 'Louisville',      -85.76, 38.25, 'eastern'],
  ['KY', 'Bowling Green',   -86.44, 36.99, 'central'],
  ['KY', 'Lexington',       -84.50, 38.04, 'eastern'],
  ['KY', 'Paducah',         -88.60, 37.08, 'central'],
  ['MI', 'Iron River',      -88.64, 46.09, 'central'],
  ['MI', 'Ironwood',        -90.17, 46.45, 'central'],
  ['MI', 'Marquette',       -87.40, 46.54, 'eastern'],
  ['MI', 'Detroit',         -83.05, 42.33, 'eastern'],
  ['IN', 'Gary',            -87.35, 41.60, 'central'],
  ['IN', 'Evansville',      -87.57, 37.97, 'central'],
  ['IN', 'Indianapolis',    -86.16, 39.77, 'eastern'],
  ['IN', 'Fort Wayne',      -85.14, 41.08, 'eastern'],
  ['KS', 'Goodland',       -101.71, 39.35, 'mountain'],
  ['KS', 'Wichita',         -97.34, 37.69, 'central'],
  ['NE', 'Scottsbluff',    -103.67, 41.87, 'mountain'],
  ['NE', 'Omaha',           -95.94, 41.26, 'central'],
  ['SD', 'Rapid City',     -103.23, 44.08, 'mountain'],
  ['SD', 'Sioux Falls',     -96.70, 43.55, 'central'],
];

const features = topo.objects.counties.geometries.map((g) => ({
  fips: String(g.id).padStart(5, '0'),
  name: g.properties?.name,
  f: feature(topo, g),
}));

let pass = 0;
const fails = [];

for (const [usps, city, lon, lat, expected] of CASES) {
  const hit = features.find((c) => c.fips.slice(0, 2) === stateFips(usps) && geoContains(c.f, [lon, lat]));
  if (!hit) {
    fails.push(`${usps} ${city}: no county contains the point`);
    continue;
  }
  const got = assignment[usps]?.[hit.fips];
  if (got === expected) pass++;
  else fails.push(`${usps.padEnd(3)} ${city.padEnd(15)} ${String(hit.name).padEnd(14)} expected ${String(expected).padEnd(9)} got ${got}`);
}

function stateFips(usps) {
  return {
    FL: '12', ID: '16', IN: '18', KS: '20', KY: '21', MI: '26',
    NE: '31', NV: '32', ND: '38', OR: '41', SD: '46', TN: '47', TX: '48',
  }[usps];
}

console.log(`${pass}/${CASES.length} county-zone checks passed`);
if (fails.length) {
  console.log('\nfailures:');
  for (const f of fails) console.log('  ' + f);
}
process.exit(fails.length ? 1 : 0);
