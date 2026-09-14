'use client';

import { useState } from 'react';
import { useNow } from '@/components/LiveClock';
import { useUsSettings } from './UsSettings';
import { formatClock, formatDate } from '@/lib/format';
import { zoneColor } from '@/lib/us-colors';
import type { UsStateRow } from '@/lib/us';

const INITIAL = 20;

/** Current local time in every state, colour-keyed by zone. */
export function StateTimeGrid({
  states,
  initialNow,
}: {
  states: UsStateRow[];
  initialNow: number;
}) {
  const now = useNow(initialNow);
  const { hour12, focused } = useUsSettings();
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? states : states.slice(0, INITIAL);

  return (
    <div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((s) => {
          const color = zoneColor(s.zoneKey);
          const time = formatClock(s.zone, now, { hour12 });
          const [clock, suffix] = hour12 ? time.split(' ') : [time, null];
          return (
            <li
              key={s.fips}
              id={`state-${s.usps}`}
              className={`card overflow-hidden scroll-mt-28 ${
                focused === s.fips ? 'ring-2 ring-accent' : ''
              }`}
            >
              <div
                className="flex items-center justify-between gap-2 px-3 py-1.5"
                style={{ background: color }}
              >
                <span className="truncate text-xs font-bold text-[#0b1220]">{s.name}</span>
                <span className="clock shrink-0 text-[10px] font-bold text-[#0b1220] opacity-75">
                  {s.short}
                </span>
              </div>
              <div className="px-3.5 py-3">
                <p className="clock text-2xl font-bold leading-none text-ink">
                  {clock}
                  {suffix && <span className="ml-1 align-top text-xs font-semibold text-faint">{suffix}</span>}
                </p>
                <p className="mt-1.5 text-[11px] text-faint">
                  {formatDate(s.zone, now, { style: 'medium' })}
                  {s.split && <span className="ml-1.5 text-accent">· split zone</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {states.length > INITIAL && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setExpanded((v) => !v)} className="btn">
            {expanded ? 'Show fewer states' : `Show all ${states.length} states`}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-faint">
        Split states show the time in the zone covering most of the state. Check the split-state
        list below if you need the other side of the boundary.
      </p>
    </div>
  );
}
