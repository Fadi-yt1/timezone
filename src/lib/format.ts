import { zonedParts, type Instant } from './time';

/**
 * Colour for a local hour of day, used to tint the map and clock cards.
 *
 * A cyclic twilight ramp: deep indigo at midnight, violet through dawn, golden
 * amber at noon, red at dusk, purple back into night. The stops are ordered so
 * that interpolating hue the short way never crosses green — a rainbow would
 * read as arbitrary, whereas this tracks daylight, and lightness peaks at noon
 * so the map's bright band is literally the lit half of the planet.
 */
const HOUR_STOPS: { h: number; c: [number, number, number] }[] = [
  { h: 0, c: [236, 48, 26] },   // midnight — deep indigo
  { h: 3, c: [254, 46, 31] },   // small hours — indigo violet
  { h: 6, c: [300, 44, 45] },   // dawn — violet
  { h: 8, c: [332, 52, 55] },   // early morning — rose
  { h: 10, c: [14, 68, 60] },   // morning — warm orange
  { h: 12, c: [38, 78, 66] },   // noon — golden amber
  { h: 14, c: [44, 76, 68] },   // early afternoon — bright amber
  { h: 16, c: [28, 70, 60] },   // afternoon — orange
  { h: 18, c: [356, 58, 50] },  // dusk — red
  { h: 21, c: [286, 48, 36] },  // evening — purple
  { h: 24, c: [236, 48, 26] },  // back to midnight
];

/** `hour` may be fractional; returns an `hsl(...)` string. */
export function hourColor(hour: number, { lift = 0 } = {}): string {
  const x = ((hour % 24) + 24) % 24;
  let a = HOUR_STOPS[0];
  let b = HOUR_STOPS[HOUR_STOPS.length - 1];
  for (let i = 0; i < HOUR_STOPS.length - 1; i++) {
    if (x >= HOUR_STOPS[i].h && x <= HOUR_STOPS[i + 1].h) {
      a = HOUR_STOPS[i];
      b = HOUR_STOPS[i + 1];
      break;
    }
  }
  const t = b.h === a.h ? 0 : (x - a.h) / (b.h - a.h);
  // Hue is interpolated the short way around the wheel.
  let dh = b.c[0] - a.c[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const hue = (a.c[0] + dh * t + 360) % 360;
  const sat = a.c[1] + (b.c[1] - a.c[1]) * t;
  const lum = a.c[2] + (b.c[2] - a.c[2]) * t + lift;
  return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${Math.min(94, lum).toFixed(1)}%)`;
}

/** True when the local hour falls in civil daytime. */
export function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 18;
}

export function formatClock(
  timeZone: string,
  at: Instant,
  { seconds = false, hour12 = false } = {},
): string {
  const p = zonedParts(timeZone, at);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hour12) {
    const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
    const suffix = p.hour < 12 ? 'AM' : 'PM';
    return `${h}:${pad(p.minute)}${seconds ? `:${pad(p.second)}` : ''} ${suffix}`;
  }
  return `${pad(p.hour)}:${pad(p.minute)}${seconds ? `:${pad(p.second)}` : ''}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "Monday, 14 September 2026" — rendered from zoned parts so SSR and client agree. */
export function formatDate(
  timeZone: string,
  at: Instant,
  { style = 'long' as 'long' | 'medium' | 'short' } = {},
): string {
  const p = zonedParts(timeZone, at);
  const weekday = WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
  const month = MONTHS[p.month - 1];
  if (style === 'short') return `${p.day} ${month.slice(0, 3)}`;
  if (style === 'medium') return `${weekday.slice(0, 3)}, ${p.day} ${month.slice(0, 3)} ${p.year}`;
  return `${weekday}, ${p.day} ${month} ${p.year}`;
}

/** Calendar days between two zones' current dates: -1, 0 or +1. */
export function dayShift(baseZone: string, otherZone: string, at: Instant): number {
  const a = zonedParts(baseZone, at);
  const b = zonedParts(otherZone, at);
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / 86_400_000);
}

export function dayShiftLabel(shift: number): string | null {
  if (shift === 0) return null;
  if (shift === 1) return 'next day';
  if (shift === -1) return 'previous day';
  return shift > 0 ? `+${shift} days` : `${shift} days`;
}

/** "in 3 weeks", "in 4 hours" — for DST countdowns. */
export function relativeFuture(from: Instant, to: Instant): string {
  const ms = to - from;
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  if (days < 14) return `in ${days} day${days === 1 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `in ${weeks} week${weeks === 1 ? '' : 's'}`;
  const months = Math.round(days / 30.44);
  return `in ${months} month${months === 1 ? '' : 's'}`;
}

export function formatPopulation(n: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  return `${Math.round(n / 1000)}k`;
}

/** Zone name to URL path: kept as the real IANA name. */
export function zoneHref(zone: string): string {
  return `/time-zones/${zone}`;
}

export function offsetHref(minutes: number): string {
  const sign = minutes < 0 ? 'minus' : 'plus';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `/utc-offset/${sign}-${h}${m ? `-${m}` : ''}`;
}

export function parseOffsetSlug(slug: string): number | null {
  const m = /^(plus|minus)-(\d{1,2})(?:-(\d{1,2}))?$/.exec(slug);
  if (!m) return null;
  const total = Number(m[2]) * 60 + Number(m[3] ?? 0);
  if (total > 14 * 60) return null;
  return m[1] === 'minus' ? -total : total;
}
