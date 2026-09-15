// Builds src/data/us.json: US states projected to SVG paths, joined to their time zones.
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoAlbers, geoAlbersUsa, geoPath } from 'd3-geo';

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
  atlantic:{ key: 'atlantic',name: 'Atlantic Time',          short: 'AST', zone: 'America/Puerto_Rico' },
};

// For split states, the zone covering most of the state's people and land.
// Used only to colour the map; the page lists every zone a state touches.
const MAP_ZONE_OVERRIDE = {
  Florida: 'eastern', Indiana: 'eastern', Kentucky: 'eastern', Michigan: 'eastern',
  Tennessee: 'central', Kansas: 'central', Nebraska: 'central', 'North Dakota': 'central',
  'South Dakota': 'central', Texas: 'central',
  Idaho: 'mountain', Arizona: 'arizona',
  Nevada: 'pacific', Oregon: 'pacific',
  Alaska: 'alaska', Hawaii: 'hawaii', 'Puerto Rico': 'atlantic',
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

// A coarser second geometry for the home page, where the map is a teaser shown
// at roughly half size. Dropping the least significant points keeps the shapes
// recognisable at a fraction of the path bytes.
const pre = presimplify(topo);
const liteTopo = simplify(pre, quantile(pre, 0.22));
const liteStates = feature(liteTopo, liteTopo.objects.states);
// Albers USA lifts Alaska and Hawaii into insets, which is what a US map wants.
const projection = geoAlbersUsa().scale(1300).translate([W / 2, H / 2 - 20]);
const toPath = geoPath(projection);

/**
 * Where the zone boundary runs through each split state.
 *
 * Real boundaries follow county lines and jog about; these are the meridian (or
 * in Idaho's case, the parallel) they broadly track, which is enough to colour
 * each side of a state correctly at map scale. `minority` is the zone on the
 * `side` given — the other side takes the state's mapZone.
 */
const SPLIT_BOUNDARY = {
  // Simple meridian splits.
  FL: { axis: 'lon', at: -85.0,   side: 'west', minority: 'central' },
  IN: { axis: 'lon', at: -87.20,  side: 'west', minority: 'central' },
  KY: { axis: 'lon', at: -86.0,   side: 'west', minority: 'central' },
  MI: { axis: 'lon', at: -87.6,   side: 'west', minority: 'central' },
  TN: { axis: 'lon', at: -85.3,   side: 'east', minority: 'eastern' },
  KS: { axis: 'lon', at: -101.6,  side: 'west', minority: 'mountain' },
  NE: { axis: 'lon', at: -102.05, side: 'west', minority: 'mountain' },
  SD: { axis: 'lon', at: -100.1,  side: 'west', minority: 'mountain' },
  TX: { axis: 'lon', at: -105.0,  side: 'west', minority: 'mountain' },
  NV: { axis: 'lon', at: -114.15, side: 'east', minority: 'mountain' },
  // A parallel: Idaho's panhandle is Pacific, the south Mountain.
  ID: { axis: 'lat', at: 45.52,   side: 'north', minority: 'pacific' },
  // Corners: these zones cover one corner of the state, not a whole side, so a
  // single line would repaint far too much of it.
  ND: { axis: 'corner', lon: -101.0, lonSide: 'west', lat: 47.5, latSide: 'south', minority: 'mountain' },
  OR: { axis: 'corner', lon: -117.9, lonSide: 'east', lat: 44.4, latSide: 'south', minority: 'mountain' },
};

/**
 * Projected polygon covering the minority side of a split state, used as a
 * clip path.
 *
 * The polygon is closed in *projected* space on purpose: Albers USA returns
 * null for coordinates outside the country, so closing it with far-off
 * lon/lat corners silently dropped them and collapsed the clip to a
 * zero-width line. Only the boundary itself is projected; the polygon is then
 * extended past the canvas edge in x or y.
 */
function splitClipPath(usps, projectionFn) {
  const b = SPLIT_BOUNDARY[usps];
  if (!b) return null;
  const STEPS = 28;
  const FAR = 9999;

  const meridian = (lon, latFrom, latTo) => {
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const pt = projectionFn([lon, latFrom + ((latTo - latFrom) * i) / STEPS]);
      if (pt) pts.push(pt);
    }
    return pts;
  };
  const parallel = (lat, lonFrom, lonTo) => {
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const pt = projectionFn([lonFrom + ((lonTo - lonFrom) * i) / STEPS, lat]);
      if (pt) pts.push(pt);
    }
    return pts;
  };
  const toPath = (pts) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z';

  if (b.axis === 'lon') {
    const line = meridian(b.at, 23, 51);
    if (line.length < 2) return null;
    const [fx, fy] = line[0];
    const [lx, ly] = line[line.length - 1];
    const far = b.side === 'west' ? -FAR : FAR;
    return toPath([...line, [far, ly], [far, fy]]);
  }

  if (b.axis === 'lat') {
    const line = parallel(b.at, -126, -66);
    if (line.length < 2) return null;
    const [fx, fy] = line[0];
    const [lx, ly] = line[line.length - 1];
    const far = b.side === 'north' ? -FAR : FAR;
    return toPath([...line, [lx, far], [fx, far]]);
  }

  // Corner: walk the meridian to the corner, then the parallel out to the side,
  // enclosing exactly the quadrant the zone occupies.
  const latFrom = b.latSide === 'south' ? 23 : 51;
  const lonTo = b.lonSide === 'west' ? -126 : -66;
  const down = meridian(b.lon, latFrom, b.lat);
  const across = parallel(b.lat, b.lon, lonTo);
  if (down.length < 2 || across.length < 2) return null;
  const corner = [...down, ...across];
  const [sx, sy] = corner[0];
  const [ex, ey] = corner[corner.length - 1];
  return toPath([...corner, [ex, sy]]);
}

const PR_ANCHOR = [868, 527];
const prProjection = geoAlbers().rotate([66.4, 0]).center([0, 18.2]).scale(1300).translate(PR_ANCHOR);
const prPath = geoPath(prProjection);

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
  const raw = name === 'Puerto Rico' ? prPath(f) : toPath(f);
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

// Two-tone fills for the states a zone boundary runs through.
for (const shape of shapes) {
  if (!shape.split || !shape.usps) continue;
  const clip = splitClipPath(shape.usps, projection);
  const b = SPLIT_BOUNDARY[shape.usps];
  if (clip && b) {
    shape.splitClip = clip;
    shape.splitZone = b.minority;
  }
}

// Coarse paths for the home-page teaser, keyed by FIPS.
const lite = {};
for (const f of liteStates.features) {
  const raw = f.properties?.name === 'Puerto Rico' ? prPath(f) : toPath(f);
  if (!raw) continue;
  lite[String(f.id)] = raw.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
}
for (const s of shapes) {
  if (lite[s.fips]) s.dLite = lite[s.fips];
}

// Centroids for state labels on the map.
for (const s of shapes) {
  const f = states.features.find((x) => String(x.id) === s.fips);
  const c = s.name === 'Puerto Rico' ? prPath.centroid(f) : toPath.centroid(f);
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
const full = shapes.reduce((n, s) => n + s.d.length, 0);
const liteBytes = shapes.reduce((n, s) => n + (s.dLite?.length ?? 0), 0);
console.log(`us.json: ${shapes.length} state shapes, ${splitStates.length} split states, ${kb} KB`);
console.log(`  detailed paths ${(full / 1024).toFixed(0)} KB -> lite paths ${(liteBytes / 1024).toFixed(0)} KB`);
const twoTone = shapes.filter((x) => x.splitClip).length;
console.log(`  two-tone split states: ${twoTone}/${shapes.filter((x) => x.split).length}`);
if (skipped.length) console.log('skipped:', skipped.join(', '));
for (const [k, v] of Object.entries(zoneStates)) console.log(`  ${k.padEnd(9)} ${v.length} entries`);
