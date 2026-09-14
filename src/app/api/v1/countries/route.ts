import { ok } from '@/lib/api';
import { countries } from '@/lib/data';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** GET /api/v1/countries */
export async function GET() {
  const now = Date.now();
  const results = countries.map((c) => {
    const offsets = [...new Set(c.zones.map((z) => offsetMinutes(z, now)))].sort((a, b) => a - b);
    return {
      code: c.code,
      name: c.name,
      flag: c.flag,
      zoneCount: c.zones.length,
      zones: c.zones,
      currentOffsets: offsets.map(formatUtcLabel),
    };
  });
  return ok({ count: results.length, results }, { maxAge: 60 });
}
