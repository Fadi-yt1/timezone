import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { UsMap } from '@/components/map/UsMap';
import { UsZoneClock } from '@/components/tools/UsZoneClock';
import {
  allUsZones, continentalZones, outlyingZones, statesIn, usSplitStates, usStateList, zoneColor,
} from '@/lib/us';
import { UsSettingsProvider } from '@/components/us/UsSettings';
import { UsToolbar } from '@/components/us/UsToolbar';
import { StateTimeGrid } from '@/components/us/StateTimeGrid';
import { PrintableMaps } from '@/components/us/PrintableMaps';
import { abbreviation, dstState, formatUtcLabel, nextTransition, offsetMinutes } from '@/lib/time';
import { relativeFuture } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'US time zones — Pacific, Mountain, Central and Eastern',
  description:
    'The four main United States time zones with the states in each one, current local ' +
    'time, UTC offsets and daylight saving dates — including the thirteen states split ' +
    'across two zones.',
  alternates: { canonical: '/us-time-zones' },
};

export default function UsTimeZonesPage() {
  const now = Date.now();
  const anchor = continentalZones[3].zone; // Eastern, for the shared DST date
  const transition = nextTransition(anchor, now);

  return (
    <>
      <PageHeader
        eyebrow="United States"
        title="US time zones"
        lede="The contiguous United States runs on four time zones — Pacific, Mountain, Central and Eastern — each one hour apart. Here is what time it is in each right now, and which states sit in which."
      />

      <UsSettingsProvider>
      <div className="shell py-8">
        {/* Live strip of the four zones */}
        <section
          aria-label="Current time in each US zone"
          className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {continentalZones.map((z) => (
            <UsZoneClock
              key={z.key}
              zone={z.zone}
              name={z.name}
              short={z.short}
              color={zoneColor(z.key)}
              initialNow={now}
              compact
            />
          ))}
        </section>

        {/* Map */}
        <section className="mt-8">
          <div className="card overflow-hidden">
            <UsToolbar states={usStateList} />
            <div className="relative aspect-[16/10] w-full bg-canvas">
              <UsMap initialNow={now} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3.5 sm:px-5">
              <span className="label">Zones</span>
              {[...continentalZones, ...outlyingZones].map((z) => (
                <span key={z.key} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-3 w-4 rounded-sm" style={{ background: zoneColor(z.key) }} />
                  {z.name}
                </span>
              ))}

            </div>
          </div>
          <p className="mt-3 text-xs text-faint">
            States are filled by the zone that covers most of them. Thirteen states are split across a
            boundary and are listed in full further down. Hover any state for its current local time.
          </p>
        </section>

        {/* Current time in every state */}
        <section id="state-times" className="mt-14 scroll-mt-24">
          <h2 className="display text-2xl font-bold tracking-tight">US time right now</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Current local time in every state, colour-keyed by zone. Use the clock toggle above to
            switch between 12- and 24-hour.
          </p>
          <div className="mt-5">
            <StateTimeGrid states={usStateList} initialNow={now} />
          </div>
        </section>

        {/* One section per zone */}
        <div className="mt-14 space-y-12">
          {continentalZones.map((z) => {
            const full = statesIn(z.key).filter((s) => s.coverage === 'full');
            // A whole-state entry can still carry a caveat (Arizona's no-DST rule);
            // those get a full row rather than a bare chip so the note is visible.
            const fullPlain = full.filter((s) => !s.note);
            const fullNoted = full.filter((s) => s.note);
            const partial = statesIn(z.key).filter((s) => s.coverage === 'partial');
            const offset = offsetMinutes(z.zone, now);
            const st = dstState(z.zone, now);

            return (
              <section key={z.key} id={z.key} className="scroll-mt-24">
                <div className="flex items-start gap-4 border-b border-line pb-5">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-10 w-1.5 shrink-0 rounded-full"
                    style={{ background: zoneColor(z.key) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="display text-2xl font-bold tracking-tight">{z.name}</h2>
                      <span className="clock text-sm text-faint">
                        {abbreviation(z.zone, now)} · {formatUtcLabel(offset)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <UsZoneClock
                        zone={z.zone}
                        name={z.name}
                        short={z.short}
                        color={zoneColor(z.key)}
                        initialNow={now}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                  <div>
                    <h3 className="label mb-3">
                      {full.length} state{full.length === 1 ? '' : 's'} entirely in {z.short}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {fullPlain.map((s) => (
                        <li
                          key={s.state}
                          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                        >
                          {s.state}
                          <span className="clock ml-2 text-[11px] text-faint">{s.usps}</span>
                        </li>
                      ))}
                    </ul>

                    {fullNoted.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {fullNoted.map((s) => (
                          <li
                            key={s.state}
                            className="flex flex-wrap items-baseline gap-x-2.5 rounded-lg border border-accent/30
                                       bg-accent/5 px-3.5 py-2.5 text-sm"
                          >
                            <span className="font-medium text-ink">{s.state}</span>
                            <span className="clock text-[11px] text-faint">{s.usps}</span>
                            <span className="text-xs text-muted">— {s.note}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {partial.length > 0 && (
                      <>
                        <h3 className="label mb-3 mt-7">
                          {partial.length} state{partial.length === 1 ? '' : 's'} partly in {z.short}
                        </h3>
                        <ul className="space-y-1.5">
                          {partial.map((s) => (
                            <li
                              key={s.state}
                              className="flex flex-wrap items-baseline gap-x-2.5 rounded-lg border border-line
                                         bg-surface px-3.5 py-2.5 text-sm"
                            >
                              <span className="font-medium text-ink">{s.state}</span>
                              <span className="clock text-[11px] text-faint">{s.usps}</span>
                              {s.note && <span className="text-xs text-muted">— {s.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <aside className="card h-fit p-5">
                    <h3 className="display text-base font-semibold">Zone facts</h3>
                    <dl className="mt-3 divide-y divide-line text-sm">
                      {[
                        ['IANA zone', <code key="z" className="text-ink">{z.zone}</code>],
                        ['Standard time', <span key="s" className="clock">{formatUtcLabel(st.standardOffset)}</span>],
                        st.dstOffset !== null
                          ? ['Daylight time', <span key="d" className="clock">{formatUtcLabel(st.dstOffset)}</span>]
                          : null,
                        ['Right now', st.observesDst ? (st.inDst ? 'Daylight time' : 'Standard time') : 'No DST'],
                      ]
                        .filter(Boolean)
                        .map((row) => {
                          const [k, v] = row as [string, React.ReactNode];
                          return (
                            <div key={k} className="flex items-baseline justify-between gap-3 py-2.5">
                              <dt className="text-faint">{k}</dt>
                              <dd className="text-right font-medium text-ink">{v}</dd>
                            </div>
                          );
                        })}
                    </dl>
                    <Link href={`/time-zones/${z.zone}`} className="mt-4 inline-block text-sm text-accent hover:underline">
                      Full zone detail &rarr;
                    </Link>
                  </aside>
                </div>
              </section>
            );
          })}
        </div>

        {/* Split states */}
        <section id="split-states" className="mt-14 scroll-mt-24">
          <h2 className="display text-2xl font-bold tracking-tight">States split across two zones</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Time zone boundaries follow county lines, not state lines. These {usSplitStates.length}{' '}
            states straddle one, so the right answer depends on where in the state you are.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {usSplitStates.map((s) => (
              <div key={s.state} className="card p-4">
                <p className="font-semibold text-ink">
                  {s.state}
                  <span className="clock ml-2 text-[11px] font-normal text-faint">{s.usps}</span>
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {s.zones.map((z) => (
                    <li key={z.zoneKey} className="flex gap-2.5 text-xs">
                      <span
                        aria-hidden="true"
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: zoneColor(z.zoneKey) }}
                      />
                      <span>
                        <span className="font-medium text-ink">{allUsZones[z.zoneKey].name}</span>
                        {z.note && <span className="text-muted"> — {z.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <PrintableMaps />

        {/* Outside the lower 48 */}
        <section className="mt-14">
          <h2 className="display text-2xl font-bold tracking-tight">Beyond the four main zones</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            The four zones above cover the contiguous states. The rest of the country adds three
            more, and two places opt out of daylight saving altogether.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {outlyingZones.map((z) => (
              <div key={z.key} className="card relative overflow-hidden p-5 pt-6">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: zoneColor(z.key) }} />
                <h3 className="font-semibold text-ink">{z.name}</h3>
                <div className="mt-2.5">
                  <UsZoneClock
                    zone={z.zone}
                    name={z.name}
                    short={z.short}
                    color={zoneColor(z.key)}
                    initialNow={now}
                    compact={false}
                  />
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {statesIn(z.key).map((s) => (
                    <li key={s.state}>
                      <span className="font-medium text-ink">{s.state}</span>
                      {s.note && ` — ${s.note}`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
            The territories sit further out again and none of them change their clocks: Puerto Rico
            and the US Virgin Islands keep Atlantic Time (UTC−4), Guam and the Northern Marianas use
            Chamorro Time (UTC+10), and American Samoa is on UTC−11.
          </p>
        </section>

        {/* DST */}
        <section className="card mt-14 p-6 sm:p-8">
          <h2 className="display text-2xl font-bold tracking-tight">When the clocks change</h2>
          <div className="prose-block mt-4 max-w-3xl">
            <p>
              Almost all of the United States moves its clocks forward one hour on the second Sunday
              in March and back on the first Sunday in November, at 2:00 a.m. local time. Because
              each zone changes at 2:00 a.m. by its <em>own</em> clock, the switch rolls across the
              country zone by zone rather than happening everywhere at once.
              {transition && (
                <>
                  {' '}
                  The next change is{' '}
                  <strong className="text-ink">
                    {new Date(transition.at).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                      timeZone: anchor,
                    })}
                  </strong>
                  , when clocks go {transition.forward ? 'forward' : 'back'} an hour —{' '}
                  {relativeFuture(now, transition.at)}.
                </>
              )}
            </p>
            <h3>The two places that stay put</h3>
            <p>
              Arizona keeps Mountain Standard Time all year and does not spring forward, which means
              it matches Pacific Time in summer and Mountain Time in winter. The Navajo Nation, which
              extends into Arizona, does observe daylight saving. Hawaii also stays on standard time
              year round.
            </p>
          </div>
        </section>
      </div>
      </UsSettingsProvider>
    </>
  );
}
