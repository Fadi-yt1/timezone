import type { NextRequest } from 'next/server';
import { fail, ok, parseAt, zoneSnapshot } from '@/lib/api';
import { citiesInZone, countriesForZone, getZone } from '@/lib/data';
import { transitionsInYear } from '@/lib/time';
import { isoInZone } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/v1/zones/America/New_York */
export async function GET(req: NextRequest, ctx: { params: Promise<{ zone: string[] }> }) {
  const { zone: segments } = await ctx.params;
  const name = segments.join('/');
  const z = getZone(name);
  if (!z) return fail(`Unknown time zone "${name}".`, 404);

  const at = parseAt(req.nextUrl.searchParams.get('at'));
  if (at === null) return fail('Could not parse "at".');

  const year = new Date(at).getUTCFullYear();
  const snapshot = zoneSnapshot(z.zone, at);
  return ok({
    ...snapshot,
    canonical: z.zone !== name ? z.zone : undefined,
    countryDetails: countriesForZone(z).map((c) => ({ code: c.code, name: c.name, flag: c.flag })),
    cities: citiesInZone(z.zone).slice(0, 25).map((c) => ({
      name: c.name, country: c.country, population: c.population,
      coordinates: { lat: c.lat, lon: c.lon },
    })),
    transitions: [year, year + 1].flatMap((y) =>
      transitionsInYear(z.zone, y).map((t) => ({
        year: y,
        at: new Date(t.at).toISOString(),
        localTime: isoInZone(z.zone, t.at),
        direction: t.forward ? 'forward' : 'back',
        fromOffsetMinutes: t.before,
        toOffsetMinutes: t.after,
      })),
    ),
  });
}
