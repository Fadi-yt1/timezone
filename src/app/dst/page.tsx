import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { countriesForZone, listedZones } from '@/lib/data';
import { relativeFuture } from '@/lib/format';
import { formatUtcLabel, nextTransition } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daylight saving time changes',
  description:
    'Which countries change their clocks next and exactly when. Upcoming daylight saving ' +
    'transitions worldwide, ordered by date, straight from the IANA time zone database.',
  alternates: { canonical: '/dst' },
};

export default function DstPage() {
  const now = Date.now();
  const observing = listedZones.filter((z) => z.usesDst);

  const upcoming = observing
    .map((z) => {
      const t = nextTransition(z.zone, now);
      return t ? { zone: z, t } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.t.at - b.t.at);

  // Group by calendar date so a continent-wide changeover reads as one event.
  const byDate = new Map<string, typeof upcoming>();
  for (const row of upcoming) {
    const key = new Date(row.t.at).toISOString().slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), row]);
  }
  const dates = [...byDate.entries()].slice(0, 14);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Daylight saving time"
        lede={`${observing.length} of the world's ${listedZones.length} time zones still move their clocks twice a year. Here is every upcoming change, soonest first.`}
      />

      <div className="shell py-8">
        <section className="mb-10 grid gap-3 sm:grid-cols-3">
          <div className="card p-5">
            <p className="display text-3xl font-bold text-accent">{observing.length}</p>
            <p className="mt-1 text-sm text-muted">Zones that observe DST</p>
          </div>
          <div className="card p-5">
            <p className="display text-3xl font-bold text-accent">
              {listedZones.length - observing.length}
            </p>
            <p className="mt-1 text-sm text-muted">Zones that stay put all year</p>
          </div>
          <div className="card p-5">
            <p className="display text-3xl font-bold text-accent">
              {upcoming.length ? relativeFuture(now, upcoming[0].t.at).replace('in ', '') : '—'}
            </p>
            <p className="mt-1 text-sm text-muted">Until the next change anywhere</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="display mb-4 text-2xl font-bold tracking-tight">Upcoming changes</h2>
          <div className="space-y-4">
            {dates.map(([date, rows]) => {
              const first = rows[0];
              return (
                <div key={date} className="card overflow-hidden">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-raised px-4 py-3">
                    <h3 className="font-semibold text-ink">
                      {new Date(date).toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
                      })}
                    </h3>
                    <span className="text-xs text-faint">
                      {relativeFuture(now, first.t.at)} · {rows.length} zone{rows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {rows.slice(0, 12).map(({ zone, t }) => (
                      <li key={zone.zone} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                        <Link href={`/time-zones/${zone.zone}`} className="text-sm font-medium text-ink hover:text-accent">
                          {zone.label}
                          <span className="ml-2 text-xs font-normal text-faint">
                            {countriesForZone(zone).map((c) => c.flag).join('') || zone.region}
                          </span>
                        </Link>
                        <span className="text-xs text-muted">
                          Clocks go <strong className={t.forward ? 'text-accent' : 'text-ink'}>
                            {t.forward ? 'forward' : 'back'}
                          </strong>{' '}
                          · {formatUtcLabel(t.before)} &rarr; {formatUtcLabel(t.after)}
                        </span>
                      </li>
                    ))}
                    {rows.length > 12 && (
                      <li className="px-4 py-2.5 text-xs text-faint">
                        and {rows.length - 12} more zones on this date
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="display text-2xl font-bold tracking-tight">How daylight saving works</h2>
          <div className="prose-block mt-4 max-w-3xl">
            <p>
              Daylight saving time shifts local clocks forward — almost always by exactly one
              hour — for part of the year, so that summer evenings carry more daylight. In spring
              the clocks jump forward and an hour of local time simply does not exist; in autumn
              they fall back and an hour repeats.
            </p>
            <h3>The rules are political, not astronomical</h3>
            <p>
              There is no worldwide standard. Each jurisdiction sets its own start and end dates,
              and those dates change. The European Union switches on the last Sunday in March and
              October; the United States and Canada use the second Sunday in March and the first in
              November. Countries in the southern hemisphere shift in the opposite months, and
              plenty of places have abandoned the practice entirely.
            </p>
            <h3>Why this site computes rather than looks up</h3>
            <p>
              Every transition shown here is found by stepping through the tz database&rsquo;s own
              rules for that zone and detecting where its UTC offset actually changes, rather than
              from a hand-maintained table. When a government amends its rules and the tz database
              is updated, these dates follow automatically.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
