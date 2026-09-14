import type { NextRequest } from 'next/server';
import { ok } from '@/lib/api';
import { search } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** GET /api/v1/search?q=mumbai&limit=8 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = p.get('q') ?? '';
  const limit = Math.min(Number(p.get('limit') ?? 12) || 12, 40);
  const results = search(q, limit);
  return ok({ query: q, count: results.length, results }, { maxAge: 300 });
}
