import { NextResponse } from 'next/server';
import { getZone } from './data';
import {
  abbreviation, dstState, formatOffset, formatUtcLabel, longZoneName,
  offsetMinutes, sunTimes, zonedParts, type Instant,
} from './time';
import { dayShift, formatClock, formatDate } from './format';

export function ok(body: unknown, { maxAge = 0 }: { maxAge?: number } = {}) {
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': maxAge
        ? `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`
        : 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { error: { status, message, ...extra } },
    { status, headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}

/** ISO 8601 with the zone's own offset: 2026-09-14T18:30:00+05:30 */
export function isoInZone(timeZone: string, at: Instant): string {
  const p = zonedParts(timeZone, at);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T` +
    `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    formatOffset(offsetMinutes(timeZone, at))
  );
}

/** The canonical JSON shape for "what time is it in X" across the API. */
export function zoneSnapshot(zoneName: string, at: Instant = Date.now()) {
  const z = getZone(zoneName);
  if (!z) return null;
  const offset = offsetMinutes(z.zone, at);
  const dst = dstState(z.zone, at);
  const sun =
    z.lat !== null && z.lon !== null
      ? (() => {
          const s = sunTimes(z.lat, z.lon, at);
          return {
            sunrise: s.sunrise ? new Date(s.sunrise).toISOString() : null,
            sunset: s.sunset ? new Date(s.sunset).toISOString() : null,
            sunriseLocal: s.sunrise ? formatClock(z.zone, s.sunrise) : null,
            sunsetLocal: s.sunset ? formatClock(z.zone, s.sunset) : null,
          };
        })()
      : null;

  return {
    zone: z.zone,
    label: z.label,
    aliases: z.aliases,
    countries: z.countries,
    coordinates: z.lat !== null ? { lat: z.lat, lon: z.lon } : null,
    note: z.note,
    utc: new Date(at).toISOString(),
    localTime: isoInZone(z.zone, at),
    time: formatClock(z.zone, at, { seconds: true }),
    date: formatDate(z.zone, at),
    dayOfWeek: formatDate(z.zone, at).split(',')[0],
    offsetMinutes: offset,
    offset: formatOffset(offset),
    utcLabel: formatUtcLabel(offset),
    abbreviation: abbreviation(z.zone, at),
    name: longZoneName(z.zone, at),
    dst: {
      observed: dst.observesDst,
      active: dst.inDst,
      standardOffsetMinutes: dst.standardOffset,
      dstOffsetMinutes: dst.dstOffset,
      nextTransition: dst.next
        ? {
            at: new Date(dst.next.at).toISOString(),
            localTime: isoInZone(z.zone, dst.next.at),
            direction: dst.next.forward ? 'forward' : 'back',
            fromOffsetMinutes: dst.next.before,
            toOffsetMinutes: dst.next.after,
          }
        : null,
    },
    sun,
  };
}

/** Parses ?at= / ?datetime= as epoch ms, ISO 8601, or a wall time in a zone. */
export function parseAt(raw: string | null): Instant | null {
  if (!raw) return Date.now();
  const trimmed = raw.trim();
  if (/^\d{10}$/.test(trimmed)) return Number(trimmed) * 1000;
  if (/^\d{13}$/.test(trimmed)) return Number(trimmed);
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function dayOffsetLabel(baseZone: string, otherZone: string, at: Instant) {
  return dayShift(baseZone, otherZone, at);
}
