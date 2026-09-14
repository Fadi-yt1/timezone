import type { NextRequest } from 'next/server';
import { fail, isoInZone, ok } from '@/lib/api';
import { getZone } from '@/lib/data';
import { dayShift, formatClock, formatDate } from '@/lib/format';
import { abbreviation, formatOffset, formatUtcLabel, fromZonedTime, offsetMinutes } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/convert?from=Europe/London&to=Asia/Tokyo,America/New_York
 *                     &date=2026-09-14&time=14:30
 * Omit date/time to convert "right now".
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const fromName = p.get('from');
  const toRaw = p.get('to');
  if (!fromName) return fail('Missing "from" time zone.');
  if (!toRaw) return fail('Missing "to" time zone.');

  const from = getZone(fromName);
  if (!from) return fail(`Unknown source time zone "${fromName}".`, 404);

  const targets = toRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (targets.length > 40) return fail('Convert to at most 40 zones at once.', 413);
  const unknown = targets.filter((t) => !getZone(t));
  if (unknown.length) return fail(`Unknown target time zone: ${unknown.join(', ')}`, 404);

  // Resolve the source wall-clock instant.
  let at: number;
  const dateStr = p.get('date');
  const timeStr = p.get('time');
  if (dateStr || timeStr) {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr ?? '');
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr ?? '00:00');
    if (dateStr && !d) return fail('Invalid "date". Use YYYY-MM-DD.');
    if (timeStr && !t) return fail('Invalid "time". Use HH:MM (24-hour).');
    const nowParts = new Date();
    const y = d ? Number(d[1]) : nowParts.getUTCFullYear();
    const mo = d ? Number(d[2]) : nowParts.getUTCMonth() + 1;
    const day = d ? Number(d[3]) : nowParts.getUTCDate();
    const h = t ? Number(t[1]) : 0;
    const mi = t ? Number(t[2]) : 0;
    const s = t && t[3] ? Number(t[3]) : 0;
    if (mo < 1 || mo > 12 || day < 1 || day > 31 || h > 23 || mi > 59) {
      return fail('Date or time out of range.');
    }
    at = fromZonedTime(from.zone, y, mo, day, h, mi, s);
  } else {
    at = Date.now();
  }

  const describe = (zoneName: string) => {
    const z = getZone(zoneName)!;
    const off = offsetMinutes(z.zone, at);
    const shift = dayShift(from.zone, z.zone, at);
    return {
      zone: z.zone,
      label: z.label,
      localTime: isoInZone(z.zone, at),
      time: formatClock(z.zone, at, { seconds: true }),
      time12: formatClock(z.zone, at, { hour12: true }),
      date: formatDate(z.zone, at),
      offsetMinutes: off,
      offset: formatOffset(off),
      utcLabel: formatUtcLabel(off),
      abbreviation: abbreviation(z.zone, at),
      dayShift: shift,
    };
  };

  const source = describe(from.zone);
  const results = targets.map((t) => {
    const r = describe(t);
    return { ...r, differenceMinutes: r.offsetMinutes - source.offsetMinutes };
  });

  return ok({ utc: new Date(at).toISOString(), from: source, to: results });
}
