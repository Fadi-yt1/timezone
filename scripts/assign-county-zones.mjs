// Assigns every county in the split states to a time zone, using the
// timezone-boundary-builder polygons that geo-tz ships.
//
// Run this only when regenerating: the result is committed to
// scripts/county-zones.json so the normal build (and CI) never needs geo-tz,
// which is ~71 MB. tz-lookup's raster was tried first and is not accurate at
// county resolution — it puts Shoshone County, Idaho entirely in Mountain when
// the whole county is Pacific.
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { geoBounds, geoCentroid, geoContains } from 'd3-geo';
import { find } from 'geo-tz';

const SPLIT_STATES = {
  FL: '12', ID: '16', IN: '18', KS: '20', KY: '21', MI: '26', NE: '31',
  NV: '32', ND: '38', OR: '41', SD: '46', TN: '47', TX: '48',
};

function zoneKeyFor(ianaZone) {
  const off = (at) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: ianaZone, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).formatToParts(new Date(at)).map((x) => [x.type, x.value]),
    );
    return Math.round(
      (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - at) / 60000,
    );
  };
  const y = new Date().getUTCFullYear();
  const jan = off(Date.UTC(y, 0, 15));
  const jul = off(Date.UTC(y, 6, 15));
  const std = Math.min(jan, jul);
  const dst = jan !== jul;
  if (std === -300) return 'eastern';
  if (std === -360) return 'central';
  if (std === -420) return dst ? 'mountain' : 'arizona';
  if (std === -480) return 'pacific';
  return null;
}

const topo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'node_modules/us-atlas/counties-10m.json'), 'utf8'),
);

/** Majority zone over a grid of points inside the county. */
function zoneForCounty(f) {
  const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(f);
  const STEPS = 12;
  const votes = new Map();
  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const lon = minLon + ((maxLon - minLon) * i) / STEPS;
      const lat = minLat + ((maxLat - minLat) * j) / STEPS;
      if (!geoContains(f, [lon, lat])) continue;
      const key = zoneKeyFor(find(lat, lon)[0]);
      if (!key) continue;
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }
  if (!votes.size) {
    const c = geoCentroid(f);
    return c && Number.isFinite(c[0]) ? zoneKeyFor(find(c[1], c[0])[0]) : null;
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const out = {};
for (const [usps, fips] of Object.entries(SPLIT_STATES)) {
  const geoms = topo.objects.counties.geometries.filter(
    (g) => String(g.id).padStart(5, '0').slice(0, 2) === fips,
  );
  const assigned = {};
  for (const g of geoms) {
    const key = zoneForCounty(feature(topo, g));
    if (key) assigned[String(g.id).padStart(5, '0')] = key;
  }
  out[usps] = assigned;

  const tally = {};
  for (const z of Object.values(assigned)) tally[z] = (tally[z] ?? 0) + 1;
  const parts = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  console.log(`${usps}: ${parts.map(([z, n]) => `${z} ${n}`).join(', ')}`);
}

const target = path.join(process.cwd(), 'scripts/county-zones.json');
fs.writeFileSync(target, JSON.stringify(out, null, 1));
console.log(`\ncounty-zones.json written (${(fs.statSync(target).size / 1024).toFixed(0)} KB)`);
