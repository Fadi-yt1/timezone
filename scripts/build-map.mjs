// Projects the world-atlas topology into SVG paths and links each country to a time zone.
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';

const OUT = path.join(process.cwd(), 'src/data');
const W = 1000;
const H = 500; // equirectangular is exactly 2:1, so x maps linearly to longitude

const topo = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'node_modules/world-atlas/countries-110m.json'), 'utf8'),
);
const countriesGeo = feature(topo, topo.objects.countries);

// Equirectangular keeps longitude linear in x — essential for a time zone map,
// where each 15° of longitude is one hour of solar time.
const projection = geoEquirectangular()
  .scale(W / (2 * Math.PI))
  .translate([W / 2, H / 2]);
const toPath = geoPath(projection);

const countries = JSON.parse(fs.readFileSync(path.join(OUT, 'countries.json'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(path.join(OUT, 'cities.json'), 'utf8'));

const norm = (s) =>
  s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\b(the|of|and|republic|democratic|people s|islamic|federal|united)\b/g, '').replace(/\s+/g, ' ').trim();

const byNorm = new Map();
for (const c of countries) {
  byNorm.set(norm(c.name), c);
  // iso3166.tab often carries a short common name after a comma.
  if (c.name.includes(',')) byNorm.set(norm(c.name.split(',')[0]), c);
}

// world-atlas uses Natural Earth's shorthand for some names.
const OVERRIDES = {
  'United States of America': 'US', 'Dem. Rep. Congo': 'CD', 'Congo': 'CG',
  'Dominican Rep.': 'DO', 'Falkland Is.': 'FK', 'Fr. S. Antarctic Lands': 'TF',
  'Bosnia and Herz.': 'BA', 'Central African Rep.': 'CF', 'Eq. Guinea': 'GQ',
  'S. Sudan': 'SS', 'Solomon Is.': 'SB', 'W. Sahara': 'EH', 'Czechia': 'CZ',
  'North Macedonia': 'MK', 'Côte d’Ivoire': 'CI', "Côte d'Ivoire": 'CI',
  'Somaliland': 'SO', 'Kosovo': 'XK', 'N. Cyprus': 'CY', 'Palestine': 'PS',
  'Taiwan': 'TW', 'Myanmar': 'MM', 'Laos': 'LA', 'Vietnam': 'VN',
  'South Korea': 'KR', 'North Korea': 'KP', 'Russia': 'RU', 'Iran': 'IR',
  'Syria': 'SY', 'Turkey': 'TR', 'Türkiye': 'TR', 'Venezuela': 'VE',
  'Bolivia': 'BO', 'Tanzania': 'TZ', 'Moldova': 'MD', 'Brunei': 'BN',
  'Cabo Verde': 'CV', 'eSwatini': 'SZ', 'Eswatini': 'SZ', 'Timor-Leste': 'TL',
  'Antarctica': 'AQ',
  // tzdb's iso3166.tab spells these differently from Natural Earth.
  'United Kingdom': 'GB', 'Macedonia': 'MK',
  // Kosovo has no ISO 3166-1 code; tzdb files it under Serbia's zone.
  'Kosovo': 'RS',
};

/** A country's headline zone: the one its largest city uses. */
const primaryZoneFor = (code) => {
  const c = countries.find((x) => x.code === code);
  if (!c) return null;
  const inCountry = cities
    .filter((x) => x.country === code && c.zones.includes(x.zone))
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  return inCountry[0]?.zone ?? c.zones[0] ?? null;
};

const shapes = [];
const unmatched = [];
for (const f of countriesGeo.features) {
  const name = f.properties?.name ?? '';
  let code = OVERRIDES[name] ?? byNorm.get(norm(name))?.code ?? null;
  if (!code) {
    unmatched.push(name);
    continue;
  }
  const country = countries.find((x) => x.code === code);
  if (!country) {
    unmatched.push(`${name} -> ${code} (no tzdb entry)`);
    continue;
  }
  const raw = toPath(f);
  if (!raw) continue;
  // Trim coordinate precision: 0.1px on a 1000px canvas is invisible but halves the payload.
  const d = raw.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
  shapes.push({
    id: String(f.id ?? code),
    code,
    name: country.name,
    d,
    zone: primaryZoneFor(code),
    zoneCount: country.zones.length,
  });
}

// City dots, projected with the same transform so they land on the coastline.
const mapCities = cities
  .filter((c) => (c.population ?? 0) >= 2_000_000 || c.primary)
  .map((c) => {
    const xy = projection([c.lon, c.lat]);
    if (!xy) return null;
    return {
      name: c.name, zone: c.zone, country: c.country,
      x: Number(xy[0].toFixed(2)), y: Number(xy[1].toFixed(2)),
      population: c.population, primary: c.primary,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));

fs.writeFileSync(
  path.join(OUT, 'world.json'),
  JSON.stringify({ width: W, height: H, shapes, cities: mapCities }),
);
const kb = (fs.statSync(path.join(OUT, 'world.json')).size / 1024).toFixed(1);
console.log(`world.json: ${shapes.length} shapes, ${mapCities.length} cities, ${kb} KB`);
if (unmatched.length) console.log('unmatched:', unmatched.join(' | '));
console.log('shapes without a zone:', shapes.filter((s) => !s.zone).map((s) => s.name).join(', ') || 'none');
