import type { NextRequest } from 'next/server';
import { isoInZone, ok } from '@/lib/api';
import { listedZones } from '@/lib/data';
import { formatOffset, nextTransition } from '@/lib/time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/dst?limit=50
 * The next daylight-saving change for every zone that observes one, soonest first.
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100) || 100, 400);
  const now = Date.now();

  const upcoming = listedZones
    .filter((z) => z.usesDst)
    .map((z) => {
      const t = nextTransition(z.zone, now);
      if (!t) return null;
      return {
        zone: z.zone,
        label: z.label,
        countries: z.countries,
        at: new Date(t.at).toISOString(),
        localTime: isoInZone(z.zone, t.at),
        direction: t.forward ? 'forward' : 'back',
        fromOffset: formatOffset(t.before),
        toOffset: formatOffset(t.after),
        daysAway: Math.round((t.at - now) / 86_400_000),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return ok(
    {
      generatedAt: new Date(now).toISOString(),
      zonesObservingDst: upcoming.length,
      count: Math.min(limit, upcoming.length),
      results: upcoming.slice(0, limit),
    },
    { maxAge: 3600 },
  );
}
