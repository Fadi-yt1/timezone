/**
 * Zone colours live apart from the dataset module so client components can
 * import them without pulling the 169 KB us.json into the browser bundle.
 *
 * They run blue through red from west to east, so the map reads the way the day
 * does — and stay distinguishable from the hour ramp used on the world map.
 */
export const ZONE_COLOR: Record<string, string> = {
  pacific: '#3f8ed0',
  mountain: '#8a6fd2',
  central: '#d9803c',
  eastern: '#c4544e',
  arizona: '#a8762f',
  alaska: '#4a9e8c',
  hawaii: '#6d7fa8',
  atlantic: '#c0567f',
};

export function zoneColor(key: string): string {
  return ZONE_COLOR[key] ?? '#6b7280';
}
