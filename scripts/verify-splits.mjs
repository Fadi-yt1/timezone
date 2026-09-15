// Checks the two-tone split regions against cities whose zone is known.
import fs from 'node:fs';
import path from 'node:path';
import { geoAlbersUsa } from 'd3-geo';

const us = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/us.json'), 'utf8'));
const projection = geoAlbersUsa().scale(1300).translate([1000 / 2, 600 / 2 - 20]);

/** Parse an SVG path of straight segments into a point list. */
function pathPoints(d) {
  return [...d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]]);
}

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// city, lon, lat, the zone it really keeps
const CASES = [
  ['ND', 'Dickinson',      -102.79, 46.88, 'mountain'],
  ['ND', 'Minot',          -101.30, 48.23, 'central'],
  ['ND', 'Fargo',           -96.79, 46.88, 'central'],
  ['OR', 'Ontario',        -116.96, 44.03, 'mountain'],
  ['OR', 'Pendleton',      -118.79, 45.67, 'pacific'],
  ['OR', 'Portland',       -122.67, 45.52, 'pacific'],
  ['ID', 'Coeur d’Alene', -116.78, 47.68, 'pacific'],
  ['ID', 'Boise',          -116.20, 43.61, 'mountain'],
  ['TX', 'El Paso',        -106.49, 31.76, 'mountain'],
  ['TX', 'Dallas',          -96.80, 32.78, 'central'],
  ['FL', 'Pensacola',       -87.22, 30.42, 'central'],
  ['FL', 'Miami',           -80.19, 25.76, 'eastern'],
  ['TN', 'Knoxville',       -83.92, 35.96, 'eastern'],
  ['TN', 'Nashville',       -86.78, 36.16, 'central'],
  ['KY', 'Louisville',      -85.76, 38.25, 'eastern'],
  ['KY', 'Paducah',         -88.60, 37.08, 'central'],
  ['KY', 'Bowling Green',   -86.44, 36.99, 'central'],
  ['KY', 'Lexington',       -84.50, 38.04, 'eastern'],
  ['MI', 'Iron River',      -88.64, 46.09, 'central'],
  ['MI', 'Detroit',         -83.05, 42.33, 'eastern'],
  ['IN', 'Gary',            -87.35, 41.60, 'central'],
  ['IN', 'Indianapolis',    -86.16, 39.77, 'eastern'],
  ['IN', 'Evansville',      -87.57, 37.97, 'central'],
  ['IN', 'Fort Wayne',      -85.14, 41.08, 'eastern'],
  ['KS', 'Goodland',       -101.71, 39.35, 'mountain'],
  ['KS', 'Wichita',         -97.34, 37.69, 'central'],
  ['NE', 'Scottsbluff',    -103.67, 41.87, 'mountain'],
  ['NE', 'Omaha',           -95.94, 41.26, 'central'],
  ['SD', 'Rapid City',     -103.23, 44.08, 'mountain'],
  ['SD', 'Sioux Falls',     -96.70, 43.55, 'central'],
  ['NV', 'West Wendover',  -114.07, 40.74, 'mountain'],
  ['NV', 'Las Vegas',      -115.14, 36.17, 'pacific'],
];

const byUsps = Object.fromEntries(us.shapes.filter((s) => s.usps).map((s) => [s.usps, s]));
let pass = 0;
const fails = [];

for (const [usps, city, lon, lat, expected] of CASES) {
  const shape = byUsps[usps];
  const pt = projection([lon, lat]);
  if (!shape?.splitClip || !pt) {
    fails.push(`${usps} ${city}: no clip or projection`);
    continue;
  }
  const got = inside(pt, pathPoints(shape.splitClip)) ? shape.splitZone : shape.mapZone;
  if (got === expected) {
    pass++;
  } else {
    fails.push(`${usps.padEnd(3)} ${city.padEnd(15)} expected ${expected.padEnd(9)} got ${got}`);
  }
}

console.log(`${pass}/${CASES.length} split-boundary checks passed`);
if (fails.length) {
  console.log('\nfailures:');
  for (const f of fails) console.log('  ' + f);
}
process.exit(fails.length ? 1 : 0);
