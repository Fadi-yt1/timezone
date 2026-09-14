'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatClock, hourColor } from '@/lib/format';
import { nightPath } from '@/lib/terminator';
import { formatUtcLabel, offsetMinutes, zonedParts } from '@/lib/time';

export interface MapCountry {
  code: string;
  name: string;
  zone: string;
  zoneCount: number;
}

interface Tooltip {
  x: number;
  y: number;
  name: string;
  code: string;
  time: string;
  date: string;
  utcLabel: string;
  zoneCount: number;
}

/**
 * Drives the server-rendered map SVG passed in as children: repaints every
 * country in its local-hour colour, redraws the day/night terminator, and
 * handles hover and click by delegation. Only this small controller ships as
 * JavaScript — the path data stays in the HTML.
 */
export function MapLayer({
  countries,
  width,
  height,
  interactive = true,
  children,
}: {
  countries: MapCountry[];
  width: number;
  height: number;
  interactive?: boolean;
  children: React.ReactNode;
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // The server painted a correct first frame; this keeps it current.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now === null || !hostRef.current) return;
    const host = hostRef.current;
    for (const c of countries) {
      const el = host.querySelector<SVGPathElement>(`path[data-code="${c.code}"]`);
      if (!el) continue;
      const p = zonedParts(c.zone, now);
      el.setAttribute('fill', hourColor(p.hour + p.minute / 60));
    }
    const night = host.querySelector<SVGPathElement>('#world-map-night');
    if (night) night.setAttribute('d', nightPath(width, height, now));
  }, [now, countries, width, height]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const path = (e.target as Element).closest?.('path[data-code]');
      const host = hostRef.current;
      if (!path || !host) {
        setTooltip(null);
        return;
      }
      const code = path.getAttribute('data-code')!;
      const country = countries.find((c) => c.code === code);
      if (!country) {
        setTooltip(null);
        return;
      }
      const rect = host.getBoundingClientRect();
      const at = now ?? Date.now();
      const p = zonedParts(country.zone, at);
      setTooltip({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
        name: country.name,
        code: country.code,
        zoneCount: country.zoneCount,
        time: formatClock(country.zone, at),
        date: `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`,
        utcLabel: formatUtcLabel(offsetMinutes(country.zone, at)),
      });
    },
    [countries, interactive, now],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const path = (e.target as Element).closest?.('path[data-code]');
      const code = path?.getAttribute('data-code');
      if (code) router.push(`/countries/${code.toLowerCase()}`);
    },
    [interactive, router],
  );

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full ${interactive ? '[&_path[data-code]]:cursor-pointer' : ''}`}
      onMouseMove={onMove}
      onMouseLeave={() => setTooltip(null)}
      onClick={onClick}
    >
      {children}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)]
                     whitespace-nowrap rounded-lg border border-line bg-surface/95 px-3 py-2
                     shadow-xl shadow-black/50 backdrop-blur"
          style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%` }}
        >
          <p className="text-xs font-semibold text-ink">{tooltip.name}</p>
          <p className="clock text-lg font-bold leading-tight text-accent">{tooltip.time}</p>
          <p className="text-[11px] text-faint">
            {tooltip.date} · {tooltip.utcLabel}
            {tooltip.zoneCount > 1 ? ` · ${tooltip.zoneCount} zones` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
