'use client';

import { useEffect, useState } from 'react';
import { useNow } from '@/components/LiveClock';
import { useUsSettings } from '@/components/us/UsSettings';
import { formatClock, formatDate } from '@/lib/format';

/**
 * The reader's own local time, shown beside the four US zones, in the same
 * shape as those four: a heading, the clock, the date, and nothing else. The
 * zone it resolved to is kept in the title attribute rather than printed, so
 * the card stays legible at the width five across leaves it.
 *
 * The zone comes from the browser — Intl.DateTimeFormat().resolvedOptions() —
 * not from an IP lookup. On a statically exported site there is no server to
 * read a request's IP, so the alternative would be calling a geolocation
 * service from the page: every visitor's address sent to a third party, a
 * network round trip before the card can fill in, and an answer that is worse
 * anyway. A VPN, a proxy or a work network puts the IP somewhere the reader is
 * not, whereas this reports the zone their own clock is set to, which is what
 * "your time" has to agree with to be believed.
 *
 * It resolves only in the browser, so the card renders a placeholder of the
 * same size first and fills in on mount: server and first client render match,
 * and nothing on the page moves.
 */
export function LocalZoneClock({ initialNow }: { initialNow: number }) {
  const [zone, setZone] = useState<string | null>(null);
  const now = useNow(initialNow);
  const { hour12 } = useUsSettings();

  useEffect(() => {
    try {
      setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      /* no Intl time zone available; the card stays in its resting state */
    }
  }, []);

  const ready = zone !== null;
  let clock = '--:--';
  let suffix: string | null = null;
  let date = '';

  if (ready) {
    const full = formatClock(zone, now, { seconds: false, hour12 });
    const cut = full.lastIndexOf(' ');
    [clock, suffix] = hour12 && cut > 0 ? [full.slice(0, cut), full.slice(cut + 1)] : [full, null];
    date = formatDate(zone, now, { style: 'caps' });
  }

  return (
    <div className="card overflow-hidden text-center" title={ready ? zone : undefined}>
      <div className="bg-accent px-3 py-2">
        <p className="text-sm font-bold text-[#11182a]">Your time</p>
      </div>
      <div className="px-3 py-4">
        <p className="clock text-[2.4rem] font-bold leading-none text-ink">
          {clock}
          {suffix && <span className="ml-1.5 align-top text-sm font-bold text-faint">{suffix}</span>}
        </p>
        <p className="clock mt-2.5 text-xs font-semibold tracking-wide text-faint">
          {ready ? date : ' '}
        </p>
      </div>
    </div>
  );
}
