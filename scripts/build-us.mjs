// Builds src/data/us.json: US states projected to SVG paths, joined to their time zones.
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { geoAlbersUsa, geoPath } from 'd3-geo';

const OUT = path.join(process.cwd(), 'src/data');
const W = 1000;
const H = 600;

/** The four continental zones, plus the ones that need their own treatment. */
const ZONES = {
  pacific:  { key: 'pacific',  name: 'Pacific Time',  short: 'PT', zone: 'America/Los_Angeles' },
  mountain: { key: 'mountain', name: 'Mountain Time', short: 'MT', zone: 'America/Denver' },
  central:  { key: 'central',  name: 'Central Time',  short: 'CT', zone: 'America/Chicago' },
  eastern:  { key: 'eastern',  name: 'Eastern Time',  short: 'ET', zone: 'America/New_York' },
};

/** Zones outside the lower 48, kept separate so the page can say so plainly. */
const OUTLYING = {
  arizona: { key: 'arizona', name: 'Mountain Time (no DST)', short: 'MST', zone: 'America/Phoenix' },
  alaska:  { key: 'alaska',  name: 'Alaska Time',            short: 'AKT', zone: 'America/Anchorage' },
  hawaii:  { key: 'hawaii',  name: 'Hawaii–Aleutian Time',   short: 'HST', zone: 'Pacific/Honolulu' },
};

// For split states, the zone covering most of the state's people and land.
// Used only to colour the map; the page lists every zone a state touches.
const MAP_ZONE_OVERRIDE = {
  Florida: 'eastern', Indiana: 'eastern', Kentucky: 'eastern', Michigan: 'eastern',
  Tennessee: 'central', Kansas: 'central', Nebraska: 'central', 'North Dakota': 'central',
  'South Dakota': 'central', Texas: 'central',
  Idaho: 'mountain', Arizona: 'arizona',
  Nevada: 'pacific', Oregon: 'pacific',
  Alaska: 'alaska', Hawaii: 'hawaii',
};

// --- read the state/zone table ---
const rows = [];
for (const line of fs.readFileSync(path.join(process.cwd(), 'scripts/us-zones.tsv'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [zoneKey, state, usps, coverage, note] = line.split('\t');
  rows.push({ zoneKey, state, usps, coverage, note: (note || '').trim() || null });
}

// --- project the states ---
const topo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'node_modules/us-atlas/states-10m.json'), 'utf8'));
const states = feature(topo, topo.objects.states);
// Albers USA lifts Alaska and Hawaii into insets, which is what a US map wants.
const projection = geoAlbersUsa().scale(1300).translate([W / 2, H / 2 - 20]);
const toPath = geoPath(projection);

const byState = new Map();
for (const r of rows) {
  const list = byState.get(r.state) ?? [];
  list.push(r);
  byState.set(r.state, list);
}

const shapes = [];
const skipped = [];
for (const f of states.features) {
  const name = f.properties?.name ?? '';
  const entries = byState.get(name) ?? [];
  const mapZone = MAP_ZONE_OVERRIDE[name] ?? entries[0]?.zoneKey ?? null;
  if (!mapZone) { skipped.push(name); continue; }
  const raw = toPath(f);
  if (!raw) { skipped.push(`${name} (outside Albers USA)`); continue; }
  const d = raw.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
  shapes.push({
    fips: String(f.id),
    name,
    usps: entries[0]?.usps ?? null,
    d,
    mapZone,
    zones: entries.map((e) => e.zoneKey),
    split: entries.length > 1,
  });
}

// Centroids for state labels on the map.
for (const s of shapes) {
  const f = states.features.find((x) => String(x.id) === s.fips);
  const c = toPath.centroid(f);
  if (c && Number.isFinite(c[0])) {
    s.cx = Number(c[0].toFixed(1));
    s.cy = Number(c[1].toFixed(1));
  }
}

// --- group states under each zone for the page's lists ---
const zoneStates = {};
for (const key of [...Object.keys(ZONES), ...Object.keys(OUTLYING)]) {
  zoneStates[key] = rows
    .filter((r) => r.zoneKey === key)
    .map((r) => ({ state: r.state, usps: r.usps, coverage: r.coverage, note: r.note }))
    .sort((a, b) => a.state.localeCompare(b.state));
}
// Arizona is listed in the TSV under mountain; surface it under its own key too.
zoneStates.arizona = rows
  .filter((r) => r.state === 'Arizona')
  .map((r) => ({ state: r.state, usps: r.usps, coverage: r.coverage, note: r.note }));

const splitStates = [...byState.entries()]
  .filter(([, v]) => v.length > 1)
  .map(([state, v]) => ({
    state,
    usps: v[0].usps,
    zones: v.map((x) => ({ zoneKey: x.zoneKey, note: x.note })),
  }))
  .sort((a, b) => a.state.localeCompare(b.state));

fs.writeFileSync(
  path.join(OUT, 'us.json'),
  JSON.stringify({ width: W, height: H, zones: ZONES, outlying: OUTLYING, shapes, zoneStates, splitStates }),
);
const kb = (fs.statSync(path.join(OUT, 'us.json')).size / 1024).toFixed(1);
console.log(`us.json: ${shapes.length} state shapes, ${splitStates.length} split states, ${kb} KB`);
if (skipped.length) console.log('skipped:', skipped.join(', '));
for (const [k, v] of Object.entries(zoneStates)) console.log(`  ${k.padEnd(9)} ${v.length} entries`);
