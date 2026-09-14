import { fail, ok, zoneSnapshot } from '@/lib/api';
import { getCountry, zonesForCountry } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** GET /api/v1/countries/JP */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const country = getCountry(code);
  if (!country) return fail(`Unknown country code "${code}". Use an ISO 3166-1 alpha-2 code.`, 404);

  const now = Date.now();
  return ok({
    code: country.code,
    name: country.name,
    flag: country.flag,
    zoneCount: country.zones.length,
    zones: zonesForCountry(country.code).map((z) => zoneSnapshot(z.zone, now)),
  });
}
