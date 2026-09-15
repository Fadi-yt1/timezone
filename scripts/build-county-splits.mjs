// Merges counties into one shape per time zone, for the states a zone boundary
// crosses. Reads the committed assignment in county-zones.json (produced by
// assign-county-zones.mjs from the timezone-boundary-builder polygons), so the
// normal build needs no timezone geometry package.
import fs from 'node:fs';
import path from 'node:path';
import { merge } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

export function buildCountySplits(toPath) {
  const topo = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'node_modules/us-atlas/counties-10m.json'), 'utf8'),
  );
  const assignment = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts/county-zones.json'), 'utf8'),
  );
  const pre = presimplify(topo);
  const lite = simplify(pre, quantile(pre, 0.22));

  const byId = new Map(
    topo.objects.counties.geometries.map((g) => [String(g.id).padStart(5, '0'), g]),
  );
  const liteById = new Map(
    lite.objects.counties.geometries.map((g) => [String(g.id).padStart(5, '0'), g]),
  );

  const result = {};
  const audit = [];

  for (const [usps, counties] of Object.entries(assignment)) {
    const groups = new Map();
    for (const [fips, zone] of Object.entries(counties)) {
      if (!groups.has(zone)) groups.set(zone, []);
      groups.get(zone).push(fips);
    }
    // A state whose counties all share one zone has nothing to draw two ways.
    // Nevada is the case: only West Wendover differs, and that is part of a
    // county, so no county-level split exists to render.
    if (groups.size < 2) {
      audit.push(`${usps}: single zone across all counties — left as one fill`);
      continue;
    }

    const parts = [];
    for (const [zone, fipsList] of groups) {
      const members = fipsList.map((f) => byId.get(f)).filter(Boolean);
      const liteMembers = fipsList.map((f) => liteById.get(f)).filter(Boolean);
      if (!members.length) continue;
      const d = toPath(merge(topo, members));
      if (!d) continue;
      const dLite = liteMembers.length ? toPath(merge(lite, liteMembers)) : null;
      parts.push({ zone, d: round(d), dLite: dLite ? round(dLite) : round(d), counties: members.length });
    }
    if (parts.length < 2) continue;
    parts.sort((a, b) => b.counties - a.counties);
    result[usps] = parts;
    audit.push(`${usps}: ${parts.map((p) => `${p.zone} ${p.counties}`).join(' + ')}`);
  }

  return { result, audit };
}
