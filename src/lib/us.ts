import usJson from '@/data/us.json';

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

/**
 * Zone colours run blue through red from west to east, so the map reads the way
 * the day does — and stay distinguishable from the hour ramp used on the world map.
 */
export const ZONE_COLOR: Record<string, string> = {
  pacific: '#3f8ed0',
  mountain: '#8a6fd2',
  central: '#d9803c',
  eastern: '#c4544e',
  arizona: '#a8762f',
  alaska: '#4a9e8c',
  hawaii: '#6d7fa8',
};

export function zoneColor(key: string): string {
  return ZONE_COLOR[key] ?? '#6b7280';
}
