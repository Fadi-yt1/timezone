// Builds src/data/*.json from the system IANA tzdb + a curated city supplement.
import fs from 'node:fs';
import path from 'node:path';
import { readCountries, readZoneTab, readAllZoneNames } from './parse-tzdb.mjs';

const OUT = path.join(process.cwd(), 'src/data');
fs.mkdirSync(OUT, { recursive: true });

/** Offset of `timeZone` from UTC, in minutes, at `date`. */
function offsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function abbreviation(timeZone, date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date).find((x) => x.type === 'timeZoneName');
  return p ? p.value : null;
}

function longName(timeZone, date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longGeneric' })
    .formatToParts(date).find((x) => x.type === 'timeZoneName');
  return p ? p.value : null;
}

/** Zone name -> display label: "America/Argentina/Buenos_Aires" -> "Buenos Aires". */
function labelFor(zone) {
  const leaf = zone.split('/').pop();
  return leaf.replace(/_/g, ' ').replace(/^St /, 'St. ');
}

function flagEmoji(cc) {
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const countryNames = readCountries();
const tab = readZoneTab();
const tabByZone = new Map(tab.map((r) => [r.zone, r]));
const year = new Date().getUTCFullYear();
const jan = new Date(Date.UTC(year, 0, 15, 12));
const jul = new Date(Date.UTC(year, 6, 15, 12));

// Union of tzdb table zones (modern canonical names) and everything ICU accepts.
// This Node's ICU keeps legacy ids canonical (Asia/Calcutta, Europe/Kiev), so group
// by the ICU key and prefer the modern tzdb spelling for display and URLs.
const candidates = [...new Set([...tab.map((r) => r.zone), ...readAllZoneNames(), ...Intl.supportedValuesOf('timeZone')])]
  .filter((z) => z !== 'Factory');

function icuKey(zone) {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

const groups = new Map(); // icu key -> candidate names
for (const zone of candidates) {
  const key = icuKey(zone);
  if (!key) { console.warn('! ICU rejects zone:', zone); continue; }
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(zone);
}

const zones = [];
const aliasMap = {}; // any accepted spelling -> canonical zone name
for (const [key, names] of groups) {
  // Prefer the zone1970.tab spelling; otherwise the most specific Region/City name.
  const canonicalName =
    names.find((n) => tabByZone.has(n)) ??
    // UTC and friends all share one ICU key; "UTC" is the name people look for.
    names.find((n) => n === 'UTC') ??
    names.slice().sort((a, b) => (b.includes('/') ? 1 : 0) - (a.includes('/') ? 1 : 0) || a.length - b.length)[0];
  const row = tabByZone.get(canonicalName);
  const janOff = offsetMinutes(canonicalName, jan);
  const julOff = offsetMinutes(canonicalName, jul);
  const stdOffset = Math.min(janOff, julOff);
  const dstOffset = Math.max(janOff, julOff);
  const usesDst = janOff !== julOff;
  const aliases = names.filter((n) => n !== canonicalName).sort();
  for (const n of names) aliasMap[n] = canonicalName;
  aliasMap[key] = canonicalName;
  zones.push({
    zone: canonicalName,
    icuKey: key,
    label: labelFor(canonicalName),
    region: canonicalName.includes('/') ? canonicalName.split('/')[0] : 'Other',
    // "Listed" zones are the geographic ones users browse; Etc/UTC, US/Eastern and
    // friends stay resolvable but are kept out of directories and the map.
    listed: Boolean(row),
    utcLike: canonicalName === 'UTC' || canonicalName.startsWith('Etc/GMT'),
    aliases,
    // zone1970.tab lists the zone's own country first, then any others whose
    // clocks have matched it since 1970 (Bahamas on America/Toronto, say).
    // Keeping those apart stops Asia/Tokyo showing up under Australia.
    countries: row ? row.countries : [],
    primaryCountry: row ? row.countries[0] : null,
    sharedCountries: row ? row.countries.slice(1) : [],
    lat: row?.coords.lat ?? null,
    lon: row?.coords.lon ?? null,
    note: row?.comment ?? null,
    usesDst,
    stdOffset,
    dstOffset: usesDst ? dstOffset : null,
    stdAbbr: abbreviation(canonicalName, janOff === stdOffset ? jan : jul),
    dstAbbr: usesDst ? abbreviation(canonicalName, janOff === dstOffset ? jan : jul) : null,
    longName: longName(canonicalName, jan),
  });
}
zones.sort((a, b) => a.zone.localeCompare(b.zone));

// Countries that actually appear in the tzdb, with their zones.
const countries = [];
for (const [code, name] of Object.entries(countryNames)) {
  const own = zones.filter((z) => z.primaryCountry === code).map((z) => z.zone);
  // Countries that never host a zone of their own (San Marino, the Bahamas)
  // fall back to the zone whose clock they share.
  const shared = zones.filter((z) => z.sharedCountries.includes(code)).map((z) => z.zone);
  const list = own.length ? own : shared;
  if (!list.length) continue;
  countries.push({ code, name, flag: flagEmoji(code), zones: list, sharesZone: own.length === 0 });
}
countries.sort((a, b) => a.name.localeCompare(b.name));

// Cities: one per canonical zone (derived from the zone name) + curated supplement.
const cities = [];
const seen = new Set();
for (const z of zones) {
  if (!z.listed || z.lat === null) continue;
  const cc = z.countries[0] || null;
  const key = `${z.label}|${cc}`;
  if (seen.has(key)) continue;
  seen.add(key);
  cities.push({
    name: z.label, country: cc, countryName: cc ? countryNames[cc] ?? null : null,
    zone: z.zone, lat: z.lat, lon: z.lon, population: null, primary: true,
  });
}
const tsv = fs.readFileSync(path.join(process.cwd(), 'scripts/cities.tsv'), 'utf8');
for (const line of tsv.split('\n')) {
  if (!line.trim()) continue;
  const [name, cc, zone, lat, lon, pop] = line.split('\t');
  const key = `${name}|${cc}`;
  if (seen.has(key)) continue;
  const zoneName = aliasMap[zone];
  if (!zoneName) { console.warn('! unknown zone in cities.tsv:', zone, name); continue; }
  seen.add(key);
  cities.push({
    name, country: cc, countryName: countryNames[cc] ?? null, zone: zoneName,
    lat: Number(lat), lon: Number(lon), population: Number(pop), primary: false,
  });
}
cities.sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.name.localeCompare(b.name));

const write = (f, data) => {
  fs.writeFileSync(path.join(OUT, f), JSON.stringify(data));
  console.log(`${f}: ${Array.isArray(data) ? data.length : '-'} records, ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)} KB`);
};
write('zones.json', zones);
write('aliases.json', aliasMap);
write('countries.json', countries);
write('cities.json', cities);
console.log(`aliases.json: ${Object.keys(aliasMap).length} names`);
console.log(`generated for tzdb year ${year}; ${zones.filter((z) => z.usesDst).length} zones observe DST`);
