import usJson from '@/data/us.json';
import { zoneColor } from './us-colors';

export interface UsZone {
  key: string;
  name: string;
  short: string;
  zone: string;
}

export interface UsStateShape {
  fips: string;
  name: string;
  usps: string | null;
  d: string;
  mapZone: string;
  zones: string[];
  split: boolean;
  cx?: number;
  cy?: number;
}

export interface UsStateEntry {
  state: string;
  usps: string;
  coverage: 'full' | 'partial';
  note: string | null;
}

export interface SplitState {
  state: string;
  usps: string;
  zones: { zoneKey: string; note: string | null }[];
}

const data = usJson as unknown as {
  width: number;
  height: number;
  zones: Record<string, UsZone>;
  outlying: Record<string, UsZone>;
  shapes: UsStateShape[];
  zoneStates: Record<string, UsStateEntry[]>;
  splitStates: SplitState[];
};

export const usWidth = data.width;
export const usHeight = data.height;
export const usShapes = data.shapes;
export const usSplitStates = data.splitStates;

/** The four continental zones, west to east — the order the page presents them in. */
export const continentalZones: UsZone[] = ['pacific', 'mountain', 'central', 'eastern'].map(
  (k) => data.zones[k],
);

export const outlyingZones: UsZone[] = ['arizona', 'alaska', 'hawaii'].map((k) => data.outlying[k]);

export const allUsZones: Record<string, UsZone> = { ...data.zones, ...data.outlying };

export function statesIn(zoneKey: string): UsStateEntry[] {
  return data.zoneStates[zoneKey] ?? [];
}

export { ZONE_COLOR, zoneColor } from './us-colors';
export interface UsStateRow {
  fips: string;
  name: string;
  usps: string;
  zoneKey: string;
  /** IANA zone for the zone covering most of the state. */
  zone: string;
  short: string;
  split: boolean;
}

/**
 * One row per state for the "time now" grid — the zone covering most of the
 * state, with split states flagged so the grid can say so.
 */
export const usStateList: UsStateRow[] = usShapes
  .filter((s) => s.usps)
  .map((s) => {
    const z = allUsZones[s.mapZone];
    return {
      fips: s.fips,
      name: s.name,
      usps: s.usps as string,
      zoneKey: s.mapZone,
      zone: z.zone,
      short: z.short,
      split: s.split,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
