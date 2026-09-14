'use client';

import { useNow } from '@/components/LiveClock';
import { useUsSettings } from '@/components/us/UsSettings';
import { formatClock, formatDate } from '@/lib/format';
import { abbreviation, dstState, formatUtcLabel, offsetMinutes } from '@/lib/time';

/** Live headline clock for one US zone, used in the strip and in each zone section. */
export function UsZoneClock({
  zone,
  name,
  short,
  color,
  initialNow,
  compact = false,
}: {
  zone: string;
  name: string;
  short: string;
  color: string;
  initialNow: number;
  compact?: boolean;
}) {
  const now = useNow(initialNow);
  const { hour12 } = useUsSettings();
  const offset = offsetMinutes(zone, now);
  const dst = dstState(zone, now);
  // The big zone faces read cleaner without a ticking seconds column; the
  // detailed variant lower down the page still shows them.
  const full = formatClock(zone, now, { seconds: !compact, hour12 });
  const [clock, suffix] = hour12 ? [full.slice(0, full.lastIndexOf(' ')), full.slice(full.lastIndexOf(' ') + 1)] : [full, null];

  if (compact) {
    return (
      <div className="card overflow-hidden text-center">
        <div className="px-3 py-2" style={{ background: color }}>
          <p className="text-sm font-bold text-[#11182a]">{name}</p>
        </div>
        <div className="px-3 py-4">
          <p className="clock text-[2.4rem] font-bold leading-none text-ink">
            {clock}
            {suffix && (
              <span className="ml-1.5 align-top text-sm font-bold text-faint">{suffix}</span>
            )}
          </p>
          <p className="clock mt-2.5 text-xs font-semibold tracking-wide text-faint">
            {formatDate(zone, now, { style: 'caps' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
      <p className="clock text-4xl font-bold leading-none sm:text-5xl">
        {clock}
        {suffix && <span className="ml-1.5 align-top text-base font-semibold text-faint">{suffix}</span>}
      </p>
      <div className="text-sm text-muted">
        <p>{formatDate(zone, now)}</p>
        <p className="mt-0.5 text-xs text-faint">
          <span className="clock">{abbreviation(zone, now)}</span> · {formatUtcLabel(offset)} ·{' '}
          {dst.observesDst ? (dst.inDst ? 'on daylight time' : 'on standard time') : 'no daylight saving'}
          {' · '}
          <span className="clock">{short}</span>
        </p>
      </div>
    </div>
  );
}
