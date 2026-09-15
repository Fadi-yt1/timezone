import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { offsetGroups } from '@/lib/data';
import { offsetHref } from '@/lib/format';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';

export const metadata: Metadata = {
  title: 'UTC offsets',
  description:
    'Every UTC offset in use around the world, from UTC−12:00 to UTC+14:00, with the time ' +
    'zones and countries that sit on each one.',
  alternates: { canonical: '/utc-offset' },
};

export default function OffsetIndexPage() {
  const now = Date.now();
  const groups = offsetGroups();

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="UTC offsets"
        lede={`Standard time around the world spans ${groups.length} distinct offsets — a 26-hour spread, because a few places sit more than 12 hours either side of Greenwich.`}
      />
      <div className="shell py-8">
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const clock = new Date(now + offsetMinutes(g.zones[0].zone, now) * 60000);
            return (
              <li key={g.offset}>
                <Link href={offsetHref(g.offset)} className="card card-hover block p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="clock text-lg font-bold text-accent">{formatUtcLabel(g.offset)}</span>
                    <span className="clock text-lg font-semibold">
                      {String(clock.getUTCHours()).padStart(2, '0')}:
                      {String(clock.getUTCMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-faint">{g.zones.length} time zones</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {g.zones.slice(0, 4).map((z) => z.label).join(', ')}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
