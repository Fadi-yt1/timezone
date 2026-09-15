'use client';

import { asset } from './asset';
import type { SearchHit, SearchKind } from './data';

/** Compact index entry as emitted by scripts/build-search-index.mjs. */
interface Entry {
  k: SearchKind;
  t: string;
  s: string;
  z: string;
  h: string;
  w: number;
  n: string[];
}

let cache: Entry[] | null = null;
let inflight: Promise<Entry[]> | null = null;

/**
 * Loads the prebuilt index once, on the first keystroke.
 *
 * The site is a static export, so there is no search endpoint to call — the
 * ranking that used to run on the server runs here against the same fields.
 */
function loadIndex(): Promise<Entry[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch(asset('/search-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`search index ${r.status}`);
        return r.json() as Promise<Entry[]>;
      })
      .then((data) => {
        cache = data;
        return data;
      })
      .catch((err) => {
        inflight = null; // let a later keystroke retry
        throw err;
      });
  }
  return inflight;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_\-.]/g, ' ').trim();

export async function searchClient(query: string, limit = 12): Promise<SearchHit[]> {
  const q = normalize(query);
  if (!q) return [];
  const index = await loadIndex();

  const hits: SearchHit[] = [];
  for (const e of index) {
    let best = 0;
    for (const h of e.n) {
      if (h === q) best = Math.max(best, 100);
      else if (h.startsWith(q)) best = Math.max(best, 70 - (h.length - q.length) * 0.2);
      else if (h.includes(` ${q}`)) best = Math.max(best, 55);
      else if (h.includes(q)) best = Math.max(best, 35);
    }
    if (best > 0) {
      hits.push({ kind: e.k, title: e.t, subtitle: e.s, zone: e.z, href: e.h, score: best + e.w });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // One result per title keeps "london" from returning several near-identical rows.
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.kind}:${h.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
