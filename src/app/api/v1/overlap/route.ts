import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { getZone } from '@/lib/data';
import { formatClock } from '@/lib/format';
import { HOUR, formatUtcLabel, offsetMinutes, zonedParts } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/overlap?zones=Europe/London,Asia/Tokyo&start=9&end=17&date=2026-09-14
 *
 * Steps hour by hour through the chosen day and reports, for each UTC hour,
 * the local hour in every zone and whether it falls inside working hours —
 * which is what the meeting planner grid renders.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const raw = p.get('zones');
  if (!raw) return fail('Missing "zones" (comma separated IANA names).');

  const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (names.length < 1) return fail('Provide at least one time zone.');
  if (names.length > 12) return fail('Compare at most 12 zones at once.', 413);
  const unknown = names.filter((n) => !getZone(n));
  if (unknown.length) return fail(`Unknown time zone: ${unknown.join(', ')}`, 404);

  const start = Math.max(0, Math.min(23, Number(p.get('start') ?? 9) || 0));
  const end = Math.max(1, Math.min(24, Number(p.get('end') ?? 17) || 17));
  if (start >= end) return fail('"start" must be earlier than "end".');

  const zonesResolved = names.map((n) => getZone(n)!);
  const anchor = zonesResolved[0];

  // Anchor the 24-hour window to midnight in the first zone on the chosen date.
  const dateStr = p.get('date');
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr ?? '');
  if (dateStr && !d) return fail('Invalid "date". Use YYYY-MM-DD.');
  const now = Date.now();
  const anchorParts = zonedParts(anchor.zone, now);
  const y = d ? Number(d[1]) : anchorParts.year;
  const mo = d ? Number(d[2]) : anchorParts.month;
  const day = d ? Number(d[3]) : anchorParts.day;
  const midnightUtcGuess = Date.UTC(y, mo - 1, day, 0, 0, 0);
  const dayStart = midnightUtcGuess - offsetMinutes(anchor.zone, midnightUtcGuess) * 60000;

  const slots = [];
  for (let i = 0; i < 24; i++) {
    const at = dayStart + i * HOUR;
    const perZone = zonesResolved.map((z) => {
      const parts = zonedParts(z.zone, at);
      const working = parts.hour >= start && parts.hour < end;
      const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
      return {
        zone: z.zone,
        hour: parts.hour,
        time: formatClock(z.zone, at),
        working,
        weekend: weekday === 0 || weekday === 6,
        date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
      };
    });
    const workingCount = perZone.filter((z) => z.working && !z.weekend).length;
    slots.push({
      utc: new Date(at).toISOString(),
      zones: perZone,
      workingCount,
      allWorking: workingCount === zonesResolved.length,
    });
  }

  const best = slots.filter((s) => s.allWorking);
  return ok({
    zones: zonesResolved.map((z) => ({
      zone: z.zone,
      label: z.label,
      utcLabel: formatUtcLabel(offsetMinutes(z.zone, dayStart)),
    })),
    workingHours: { start, end },
    date: `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    slots,
    overlap: {
      hours: best.length,
      window: best.length
        ? { from: best[0].utc, to: new Date(Date.parse(best[best.length - 1].utc) + HOUR).toISOString() }
        : null,
      bestScore: Math.max(...slots.map((s) => s.workingCount)),
    },
  });
}
