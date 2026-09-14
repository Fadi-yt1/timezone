import type { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api';
import { listedZones, utcZones, zones } from '@/lib/data';
import { formatOffset, formatUtcLabel, offsetMinutes } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** GET /api/v1/zones?q=&country=&region=&include=all|listed|utc&limit= */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const include = p.get('include') ?? 'listed';
  const limit = Math.min(Number(p.get('limit') ?? 1000) || 1000, 1000);
  const q = (p.get('q') ?? '').trim().toLowerCase();
  const country = (p.get('country') ?? '').trim().toUpperCase();
  const region = (p.get('region') ?? '').trim().toLowerCase();

  let pool = include === 'all' ? zones : include === 'utc' ? utcZones : listedZones;
  if (q) pool = pool.filter((z) => z.zone.toLowerCase().includes(q) || z.label.toLowerCase().includes(q));
  // Match the country that hosts the zone, not ones that merely share its rules.
  if (country) pool = pool.filter((z) => z.primaryCountry === country || (z.sharedCountries.includes(country) && !pool.some((o) => o.primaryCountry === country)));
  if (region) pool = pool.filter((z) => z.region.toLowerCase() === region);
  if (!pool.length && (q || country || region)) return fail('No time zones matched those filters.', 404);

  const now = Date.now();
  const results = pool.slice(0, limit).map((z) => {
    const offset = offsetMinutes(z.zone, now);
    return {
      zone: z.zone,
      label: z.label,
      region: z.region,
      countries: z.countries,
      offsetMinutes: offset,
      offset: formatOffset(offset),
      utcLabel: formatUtcLabel(offset),
      observesDst: z.usesDst,
      coordinates: z.lat !== null ? { lat: z.lat, lon: z.lon } : null,
    };
  });
  return ok({ count: results.length, total: pool.length, results }, { maxAge: 60 });
}
