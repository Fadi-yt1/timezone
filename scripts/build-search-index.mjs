// Emits public/search-index.json so site search works without a server.
// Mirrors the ranking fields used by src/lib/data.ts#search.
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.join(process.cwd(), 'src/data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const zones = read('zones.json');
const countries = read('countries.json');
const cities = read('cities.json');

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\-.]/g, ' ').trim();

const out = [];

for (const c of cities) {
  out.push({
    k: 'city',
    t: c.name,
    s: [c.countryName, c.zone].filter(Boolean).join(' · '),
    z: c.zone,
    h: `/time-zones/${c.zone}`,
    w: (c.population ? Math.log10(c.population) : 4) + (c.primary ? 1.5 : 0),
    n: [normalize(c.name), normalize(c.countryName ?? '')].filter(Boolean),
  });
}

for (const z of zones.filter((x) => x.listed)) {
  out.push({
    k: 'zone',
    t: z.zone,
    s: [z.longName, z.note].filter(Boolean).join(' · ') || z.region,
    z: z.zone,
    h: `/time-zones/${z.zone}`,
    w: 4,
    n: [normalize(z.zone), normalize(z.label), normalize(z.longName ?? ''), ...z.aliases.map(normalize)].filter(Boolean),
  });
}

for (const z of zones.filter((x) => x.utcLike)) {
  out.push({
    k: 'zone',
    t: z.zone,
    s: 'Fixed offset',
    z: z.zone,
    h: `/time-zones/${z.zone}`,
    w: z.zone === 'UTC' ? 7 : 2,
    n: [normalize(z.zone), ...z.aliases.map(normalize)].filter(Boolean),
  });
}

for (const c of countries) {
  out.push({
    k: 'country',
    t: c.name,
    s: `${c.zones.length} time zone${c.zones.length === 1 ? '' : 's'}`,
    z: c.zones[0],
    h: `/countries/${c.code.toLowerCase()}`,
    w: 5.5,
    n: [normalize(c.name), normalize(c.code)],
  });
}

const target = path.join(process.cwd(), 'public/search-index.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out));
console.log(`search-index.json: ${out.length} entries, ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
