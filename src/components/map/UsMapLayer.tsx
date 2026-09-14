'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNow } from '@/components/LiveClock';
import { formatClock } from '@/lib/format';


export interface UsStateMeta {
  fips: string;
  name: string;
  zones: string[];
  split: boolean;
}

/** Just the per-zone bits the tooltip renders, passed in so the 169 KB dataset
 *  module stays on the server. */
export interface ZoneTip {
  short: string;
  zone: string;
  color: string;
}

interface Tip {
  x: number;
  y: number;
  name: string;
  rows: { label: string; time: string; color: string }[];
  split: boolean;
}

/**
 * Hover and click behaviour for the US map. The state paths themselves are
 * server-rendered and passed in as children, so only this controller ships as JS.
 */
export function UsMapLayer({
  states,
  zoneTips,
  initialNow,
  children,
}: {
  states: UsStateMeta[];
  zoneTips: Record<string, ZoneTip>;
  initialNow: number;
  children: React.ReactNode;
}) {
  const now = useNow(initialNow, 30_000);
  const [tip, setTip] = useState<Tip | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const path = (e.target as Element).closest?.('path[data-fips]');
      const host = hostRef.current;
      if (!path || !host) {
        setTip(null);
        return;
      }
      const fips = path.getAttribute('data-fips')!;
      const state = states.find((s) => s.fips === fips);
      if (!state) {
        setTip(null);
        return;
      }
      const rect = host.getBoundingClientRect();
      setTip({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
        name: state.name,
        split: state.split,
        rows: state.zones.flatMap((k) => {
          const z = zoneTips[k];
          return z ? [{ label: z.short, time: formatClock(z.zone, now), color: z.color }] : [];
        }),
      });
    },
    [states, zoneTips, now],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const path = (e.target as Element).closest?.('path[data-fips]');
      const fips = path?.getAttribute('data-fips');
      const state = states.find((s) => s.fips === fips);
      if (state) router.push(`#${state.zones[0]}`);
    },
    [states, router],
  );

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full [&_path[data-fips]]:cursor-pointer"
      onMouseMove={onMove}
      onMouseLeave={() => setTip(null)}
      onClick={onClick}
    >
      {children}
      {tip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)]
                     whitespace-nowrap rounded-lg border border-line bg-surface/95 px-3 py-2
                     shadow-xl shadow-black/40 backdrop-blur"
          style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
        >
          <p className="text-xs font-semibold text-ink">{tip.name}</p>
          <div className="mt-1 space-y-0.5">
            {tip.rows.map((r) => (
              <p key={r.label} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="clock text-sm font-bold text-ink">{r.time}</span>
                <span className="text-[11px] text-faint">{r.label}</span>
              </p>
            ))}
          </div>
          {tip.split && <p className="mt-1 text-[11px] text-faint">Split across two zones</p>}
        </div>
      )}
    </div>
  );
}
