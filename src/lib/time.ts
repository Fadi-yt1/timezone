/**
 * Time-zone maths built on the Intl/ICU tz database.
 *
 * Everything here is pure and runs identically on the server and in the browser,
 * so a page can render a correct first paint and then tick live without a mismatch.
 */

export type Instant = number; // epoch milliseconds

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

/** Wall-clock fields of `at` as seen in `timeZone`. */
export function zonedParts(timeZone: string, at: Instant): ZonedParts {
  const p = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(new Date(at))
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    // ICU renders midnight as hour 24 in some locales/zones.
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Offset from UTC in minutes for `timeZone` at `at` (east of Greenwich is positive). */
export function offsetMinutes(timeZone: string, at: Instant = Date.now()): number {
  const p = zonedParts(timeZone, at);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // `at` may carry sub-second precision that the formatted parts dropped.
  return Math.round((asUTC - Math.floor(at / 1000) * 1000) / 60000);
}

/** "+05:30", "-08:00", "+00:00" */
export function formatOffset(minutes: number, { compact = false } = {}): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (compact) return m === 0 ? `${sign}${h}` : `${sign}${h}:${String(m).padStart(2, '0')}`;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "UTC+05:30" */
export function formatUtcLabel(minutes: number): string {
  return minutes === 0 ? 'UTC' : `UTC${formatOffset(minutes, { compact: true })}`;
}

/** Short zone abbreviation as ICU knows it ("EST", "GMT+5:30"). */
export function abbreviation(timeZone: string, at: Instant = Date.now()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date(at))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/** Long descriptive name ("Eastern Daylight Time"). */
export function longZoneName(timeZone: string, at: Instant = Date.now()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'long' })
    .formatToParts(new Date(at))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/**
 * Epoch ms for a wall-clock time in `timeZone`.
 *
 * Resolved by iteration: guess using the offset at the naive instant, then
 * correct once — which settles every case except times that a DST jump skips
 * or repeats, where the earlier valid instant is returned.
 */
export function fromZonedTime(
  timeZone: string,
  y: number,
  mo: number,
  d: number,
  h = 0,
  mi = 0,
  s = 0,
): Instant {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = naive - offsetMinutes(timeZone, naive) * 60000;
  guess = naive - offsetMinutes(timeZone, guess) * 60000;
  return guess;
}

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export interface Transition {
  at: Instant;
  before: number; // offset minutes before
  after: number; // offset minutes after
  /** True when clocks move forward (entering DST). */
  forward: boolean;
}

/**
 * The next UTC-offset change for `timeZone` at or after `from`.
 *
 * Scans day by day for a year, then binary-searches the day that changed down
 * to the second, so the reported instant is the exact changeover.
 * Returns null for zones with no upcoming transition.
 */
export function nextTransition(
  timeZone: string,
  from: Instant = Date.now(),
  horizonDays = 400,
): Transition | null {
  let prev = offsetMinutes(timeZone, from);
  let cursor = from;
  for (let i = 0; i < horizonDays; i++) {
    const next = cursor + DAY;
    const off = offsetMinutes(timeZone, next);
    if (off !== prev) {
      let lo = cursor;
      let hi = next;
      while (hi - lo > 1000) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (offsetMinutes(timeZone, mid) === prev) lo = mid;
        else hi = mid;
      }
      // Offset changes land on whole minutes, but the search window starts at an
      // arbitrary instant. Snap to the minute when that still straddles the
      // change, so the reported time is the exact changeover.
      const snapped = Math.round(hi / 60000) * 60000;
      const exact =
        offsetMinutes(timeZone, snapped - 1000) === prev && offsetMinutes(timeZone, snapped) === off
          ? snapped
          : Math.round(hi / 1000) * 1000;
      return { at: exact, before: prev, after: off, forward: off > prev };
    }
    cursor = next;
    prev = off;
  }
  return null;
}

/** Every offset change in the given calendar year. */
export function transitionsInYear(timeZone: string, year: number): Transition[] {
  const out: Transition[] = [];
  const end = Date.UTC(year + 1, 0, 1);
  let cursor = Date.UTC(year - 1, 11, 31);
  for (let i = 0; i < 8 && cursor < end; i++) {
    const t = nextTransition(timeZone, cursor, 400);
    if (!t || t.at >= end) break;
    out.push(t);
    cursor = t.at + HOUR;
  }
  return out;
}

export interface DstState {
  observesDst: boolean;
  inDst: boolean;
  standardOffset: number;
  dstOffset: number | null;
  next: Transition | null;
}

/** Current DST standing of a zone, derived from its own transitions. */
export function dstState(timeZone: string, at: Instant = Date.now()): DstState {
  const current = offsetMinutes(timeZone, at);
  const year = new Date(at).getUTCFullYear();
  const jan = offsetMinutes(timeZone, Date.UTC(year, 0, 15));
  const jul = offsetMinutes(timeZone, Date.UTC(year, 6, 15));
  const observesDst = jan !== jul;
  const standardOffset = observesDst ? Math.min(jan, jul) : current;
  const dstOffset = observesDst ? Math.max(jan, jul) : null;
  return {
    observesDst,
    inDst: observesDst && current === dstOffset,
    standardOffset,
    dstOffset,
    next: observesDst ? nextTransition(timeZone, at) : null,
  };
}

/* ---------------------------------------------------------------- sun times */

const RAD = Math.PI / 180;

/**
 * Sunrise and sunset for a date and location, via the NOAA solar equations.
 * Either value is null when the sun stays up or down all day.
 */
export function sunTimes(
  lat: number,
  lon: number,
  at: Instant = Date.now(),
): { sunrise: Instant | null; sunset: Instant | null; solarNoon: Instant } {
  const d = new Date(at);
  const dayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  // Julian day for noon UTC on the requested date.
  const jd = dayMs / DAY + 2440587.5 + 0.5;
  const n = Math.round(jd - 2451545.0 - 0.0009 - -lon / 360);
  const Jnoon0 = 2451545.0 + 0.0009 + -lon / 360 + n;
  const M = (357.5291 + 0.98560028 * (Jnoon0 - 2451545)) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jtransit = Jnoon0 + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const decl = Math.asin(Math.sin(L * RAD) * Math.sin(23.44 * RAD));
  // -0.833° accounts for refraction and the solar disc's radius.
  const cosH =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) /
    (Math.cos(lat * RAD) * Math.cos(decl));
  const solarNoon = (Jtransit - 2440587.5) * DAY;
  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null, solarNoon };
  const H = Math.acos(cosH) / RAD;
  const Jset = Jnoon0 + H / 360 + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const Jrise = Jtransit - (Jset - Jtransit);
  return {
    sunrise: (Jrise - 2440587.5) * DAY,
    sunset: (Jset - 2440587.5) * DAY,
    solarNoon,
  };
}

/**
 * The sub-solar point: where the sun is directly overhead right now.
 * Drives the day/night terminator drawn on the world map.
 */
export function subsolarPoint(at: Instant = Date.now()): { lat: number; lon: number } {
  const n = at / DAY + 2440587.5 - 2451545.0;
  const M = (357.5291 + 0.98560028 * n) % 360;
  const C =
    1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 102.9372 + 180) % 360; // true ecliptic longitude
  const lat = Math.asin(Math.sin(L * RAD) * Math.sin(23.44 * RAD)) / RAD;

  // Equation of time: the sun's right ascension runs ahead of or behind the
  // mean sun by up to ~16 minutes, shifting the subsolar meridian.
  const ra = Math.atan2(Math.cos(23.44 * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) / RAD;
  const meanLon = (M + 102.9372 + 180) % 360;
  let eot = meanLon - ra; // degrees
  while (eot > 180) eot -= 360;
  while (eot < -180) eot += 360;

  const d = new Date(at);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  let lon = -15 * (utcHours - 12) - eot;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return { lat, lon };
}
