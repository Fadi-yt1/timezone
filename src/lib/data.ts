import zonesJson from '@/data/zones.json';
import countriesJson from '@/data/countries.json';
import citiesJson from '@/data/cities.json';
import aliasesJson from '@/data/aliases.json';
import type { City, Country, Zone } from './types';

export const zones = zonesJson as Zone[];
export const countries = countriesJson as Country[];
export const cities = citiesJson as City[];
const aliases = aliasesJson as Record<string, string>;

/** Geographic zones only — what directories, the map and search browse. */
export const listedZones = zones.filter((z) => z.listed);
export const utcZones = zones.filter((z) => z.utcLike);

const byZone = new Map(zones.map((z) => [z.zone, z]));
const byLower = new Map<string, Zone>();
for (const z of zones) {
  byLower.set(z.zone.toLowerCase(), z);
  for (const a of z.aliases) byLower.set(a.toLowerCase(), z);
}
for (const [name, canonical] of Object.entries(aliases)) {
  const z = byZone.get(canonical);
  if (z) byLower.set(name.toLowerCase(), z);
}

const countryByCode = new Map(countries.map((c) => [c.code, c]));

/** Resolve any accepted spelling or alias to its Zone. Case-insensitive. */
export function getZone(name: string): Zone | undefined {
  if (!name) return undefined;
  return byZone.get(name) ?? byLower.get(name.trim().toLowerCase().replace(/\s+/g, '_'));
}

export function getCountry(code: string): Country | undefined {
  return countryByCode.get(code.toUpperCase());
}

export function zonesForCountry(code: string): Zone[] {
  const c = getCountry(code);
  if (!c) return [];
  return c.zones.map((z) => byZone.get(z)).filter((z): z is Zone => Boolean(z));
}

/** The country hosting this zone first, then any that share its clock. */
export function countriesForZone(zone: Zone): Country[] {
  const ordered = [
    ...(zone.primaryCountry ? [zone.primaryCountry] : []),
    ...zone.sharedCountries,
  ];
  return ordered.map((c) => countryByCode.get(c)).filter((c): c is Country => Boolean(c));
}

const citiesByZone = new Map<string, City[]>();
for (const c of cities) {
  const list = citiesByZone.get(c.zone) ?? [];
  list.push(c);
  citiesByZone.set(c.zone, list);
}
for (const list of citiesByZone.values()) {
  list.sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.name.localeCompare(b.name));
}

export function citiesInZone(zone: string): City[] {
  return citiesByZone.get(zone) ?? [];
}

/** The cities that anchor the world map and the default clock wall. */
export const featuredCities: City[] = [
  'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney',
  'America/Sao_Paulo', 'Africa/Lagos', 'Asia/Singapore', 'America/Chicago',
]
  .map((z) => citiesInZone(z)[0] ?? synthesizeCity(z))
  .filter((c): c is City => Boolean(c));

function synthesizeCity(zoneName: string): City | null {
  const z = getZone(zoneName);
  if (!z) return null;
  return {
    name: z.label,
    country: z.countries[0] ?? null,
    countryName: z.countries[0] ? (countryByCode.get(z.countries[0])?.name ?? null) : null,
    zone: z.zone,
    lat: z.lat ?? 0,
    lon: z.lon ?? 0,
    population: null,
    primary: true,
  };
}

/* ------------------------------------------------------------------ search */

export type SearchKind = 'city' | 'zone' | 'country';

export interface SearchHit {
  kind: SearchKind;
  /** What to show as the headline, e.g. "Mumbai". */
  title: string;
  /** Supporting line, e.g. "India · Asia/Kolkata". */
  subtitle: string;
  zone: string;
  href: string;
  score: number;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\-.]/g, ' ').trim();

interface IndexEntry {
  kind: SearchKind;
  title: string;
  subtitle: string;
  zone: string;
  href: string;
  haystack: string[];
  weight: number;
}

let index: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const c of cities) {
    out.push({
      kind: 'city',
      title: c.name,
      subtitle: [c.countryName, c.zone].filter(Boolean).join(' · '),
      zone: c.zone,
      href: `/time-zones/${c.zone}`,
      haystack: [normalize(c.name), normalize(c.countryName ?? '')],
      // Big cities outrank small ones; zone namesakes outrank the rest.
      weight: (c.population ? Math.log10(c.population) : 4) + (c.primary ? 1.5 : 0),
    });
  }
  for (const z of listedZones) {
    out.push({
      kind: 'zone',
      title: z.zone,
      subtitle: [z.longName, z.note].filter(Boolean).join(' · ') || z.region,
      zone: z.zone,
      href: `/time-zones/${z.zone}`,
      haystack: [normalize(z.zone), normalize(z.label), normalize(z.longName ?? ''), ...z.aliases.map(normalize)],
      weight: 4,
    });
  }
  for (const z of utcZones) {
    out.push({
      kind: 'zone',
      title: z.zone,
      subtitle: 'Fixed offset',
      zone: z.zone,
      href: `/time-zones/${z.zone}`,
      haystack: [normalize(z.zone), ...z.aliases.map(normalize)],
      weight: z.zone === 'UTC' ? 7 : 2,
    });
  }
  for (const c of countries) {
    out.push({
      kind: 'country',
      title: c.name,
      subtitle: `${c.zones.length} time zone${c.zones.length === 1 ? '' : 's'}`,
      zone: c.zones[0],
      href: `/countries/${c.code.toLowerCase()}`,
      haystack: [normalize(c.name), normalize(c.code)],
      weight: 5.5,
    });
  }
  return out;
}

/** Ranked fuzzy-ish search over cities, zones and countries. */
export function search(query: string, limit = 12): SearchHit[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  if (!index) index = buildIndex();
  const hits: SearchHit[] = [];
  for (const e of index) {
    let best = 0;
    for (const h of e.haystack) {
      if (!h) continue;
      if (h === q) best = Math.max(best, 100);
      else if (h.startsWith(q)) best = Math.max(best, 70 - (h.length - q.length) * 0.2);
      else if (h.includes(` ${q}`)) best = Math.max(best, 55);
      else if (h.includes(q)) best = Math.max(best, 35);
    }
    if (best > 0) hits.push({ ...e, score: best + e.weight });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  // One result per zone keeps "london" from returning five near-identical rows.
  const seen = new Set<string>();
  const deduped: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.kind}:${h.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/** Distinct UTC offsets currently in use, for the offset directory. */
export function offsetGroups(): { offset: number; zones: Zone[] }[] {
  const map = new Map<number, Zone[]>();
  for (const z of listedZones) {
    const list = map.get(z.stdOffset) ?? [];
    list.push(z);
    map.set(z.stdOffset, list);
  }
  return [...map.entries()]
    .map(([offset, zs]) => ({ offset, zones: zs.sort((a, b) => a.zone.localeCompare(b.zone)) }))
    .sort((a, b) => a.offset - b.offset);
}
