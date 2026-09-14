import type { NextRequest } from 'next/server';
import { fail, ok, parseAt, zoneSnapshot } from '@/lib/api';
import { featuredCities, getZone } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** GET /api/v1/time?zone=Asia/Tokyo[,Europe/Paris][&at=ISO] */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const at = parseAt(params.get('at'));
  if (at === null) return fail('Could not parse "at". Use ISO 8601 or epoch seconds/milliseconds.');

  const raw = params.get('zone') ?? params.get('zones');
  const names = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : featuredCities.map((c) => c.zone);

  if (names.length > 60) return fail('Request at most 60 zones at once.', 413);

  const unknown = names.filter((n) => !getZone(n));
  if (unknown.length) {
    return fail(`Unknown time zone: ${unknown.join(', ')}`, 404, {
      hint: 'Use an IANA name such as America/New_York. See /api/v1/zones.',
    });
  }

  const results = names.map((n) => zoneSnapshot(n, at));
  return ok({ utc: new Date(at).toISOString(), count: results.length, results });
}
