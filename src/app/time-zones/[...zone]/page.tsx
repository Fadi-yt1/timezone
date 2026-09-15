import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { ZoneHeadline } from '@/components/ZoneDetail';
import { ClockCard } from '@/components/ClockCard';
import { citiesInZone, countriesForZone, getZone, listedZones, utcZones } from '@/lib/data';
import { formatPopulation, offsetHref, relativeFuture } from '@/lib/format';
import { dstState, formatUtcLabel, offsetMinutes, transitionsInYear } from '@/lib/time';

interface Props {
  params: Promise<{ zone: string[] }>;
}

// Only canonical IANA spellings are pre-rendered; alias URLs are not emitted.
export const dynamicParams = false;

export function generateStaticParams() {
  return [...listedZones, ...utcZones].map((z) => ({ zone: z.zone.split('/') }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { zone: segs } = await params;
  const z = getZone(segs.join('/'));
  if (!z) return { title: 'Time zone not found' };
  const off = formatUtcLabel(offsetMinutes(z.zone, Date.now()));
  return {
    title: `Current time in ${z.label} (${z.zone})`,
    description:
      `Current local time in ${z.label}, ${z.zone}. Currently ${off}` +
      `${z.usesDst ? ', with daylight saving time observed' : ', with no daylight saving time'}. ` +
      `Includes sunrise and sunset, DST transition dates and the cities that use this zone.`,
    alternates: { canonical: `/time-zones/${z.zone}` },
  };
}

export default async function ZonePage({ params }: Props) {
  const { zone: segs } = await params;
  const requested = segs.join('/');
  const z = getZone(requested);
  if (!z) notFound();

  const now = Date.now();
  const offset = offsetMinutes(z.zone, now);
  const dst = dstState(z.zone, now);
  const zoneCountries = countriesForZone(z);
  const zoneCities = citiesInZone(z.zone);
  const year = new Date(now).getUTCFullYear();
  const transitions = [year, year + 1].flatMap((y) =>
    transitionsInYear(z.zone, y).map((t) => ({ ...t, year: y })),
  );
  const sameOffset = listedZones
    .filter((o) => o.zone !== z.zone && offsetMinutes(o.zone, now) === offset)
    .slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow={zoneCountries.map((c) => `${c.flag} ${c.name}`).join(' · ') || z.region}
        title={`Time in ${z.label}`}
        lede={
          [
            z.longName,
            z.note,
            z.usesDst ? 'Observes daylight saving time.' : 'Does not observe daylight saving time.',
          ]
            .filter(Boolean)
            .join(' · ')
        }
      />

      <div className="shell grid gap-6 py-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <ZoneHeadline zone={z.zone} name={z.label} initialNow={now} lat={z.lat} lon={z.lon} />

          <section className="card p-5 sm:p-6">
            <h2 className="display text-lg font-semibold">Daylight saving time</h2>
            {dst.observesDst ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {z.label} is currently on{' '}
                  <strong className="text-ink">
                    {dst.inDst ? 'daylight saving time' : 'standard time'}
                  </strong>
                  , at {formatUtcLabel(offset)}. Standard time is{' '}
                  {formatUtcLabel(dst.standardOffset)} and summer time is{' '}
                  {formatUtcLabel(dst.dstOffset ?? offset)}.
                </p>
                {dst.next && (
                  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <p className="label text-accent">Next change</p>
                    <p className="mt-1.5 text-sm text-ink">
                      Clocks go <strong>{dst.next.forward ? 'forward' : 'back'}</strong> one hour on{' '}
                      <strong>
                        {new Date(dst.next.at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric', timeZone: z.zone,
                        })}
                      </strong>{' '}
                      — {relativeFuture(now, dst.next.at)}.
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {formatUtcLabel(dst.next.before)} &rarr; {formatUtcLabel(dst.next.after)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {z.label} stays on {formatUtcLabel(offset)} all year. There is no seasonal clock
                change in this zone.
              </p>
            )}

            {transitions.length > 0 && (
              <div className="mt-5">
                <h3 className="label mb-2">Transitions in {year}–{year + 1}</h3>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {transitions.map((t) => (
                    <li key={t.at} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <span className="text-ink">
                        {new Date(t.at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric', timeZone: z.zone,
                        })}
                      </span>
                      <span className="text-xs text-muted">
                        {t.forward ? 'Forward' : 'Back'} 1h · {formatUtcLabel(t.before)} &rarr;{' '}
                        {formatUtcLabel(t.after)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {zoneCities.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h2 className="display text-lg font-semibold">
                Cities using {z.zone}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {zoneCities.slice(0, 40).map((c) => (
                  <li
                    key={`${c.name}-${c.country}`}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-xs text-muted"
                  >
                    {c.name}
                    {c.population && (
                      <span className="ml-1.5 text-faint">{formatPopulation(c.population)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="display text-lg font-semibold">Zone facts</h2>
            <dl className="mt-3 divide-y divide-line text-sm">
              {[
                ['IANA name', <code key="n" className="text-ink">{z.zone}</code>],
                ['UTC offset', <span key="o" className="clock text-accent">{formatUtcLabel(offset)}</span>],
                ['Abbreviation', dst.inDst ? (z.dstAbbr ?? z.stdAbbr) : z.stdAbbr],
                ['Observes DST', z.usesDst ? 'Yes' : 'No'],
                ['Region', z.region],
                z.lat !== null ? ['Coordinates', `${z.lat.toFixed(2)}, ${z.lon!.toFixed(2)}`] : null,
                z.aliases.length ? ['Also known as', z.aliases.join(', ')] : null,
              ]
                .filter(Boolean)
                .map((row) => {
                  const [k, v] = row as [string, React.ReactNode];
                  return (
                    <div key={k} className="flex items-baseline justify-between gap-3 py-2.5">
                      <dt className="shrink-0 text-faint">{k}</dt>
                      <dd className="text-right font-medium text-ink">{v}</dd>
                    </div>
                  );
                })}
            </dl>
            <Link href={offsetHref(z.stdOffset)} className="mt-4 inline-block text-sm text-accent hover:underline">
              All zones at {formatUtcLabel(z.stdOffset)} &rarr;
            </Link>
          </section>

          {zoneCountries.length > 0 && (
            <section className="card p-5">
              <h2 className="display text-lg font-semibold">Countries</h2>
              <ul className="mt-3 space-y-1.5">
                {zoneCountries.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/countries/${c.code.toLowerCase()}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
                    >
                      <span aria-hidden="true">{c.flag}</span>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sameOffset.length > 0 && (
            <section>
              <h2 className="display mb-3 text-lg font-semibold">
                Same time right now
              </h2>
              <div className="grid gap-2.5">
                {sameOffset.slice(0, 4).map((o) => (
                  <ClockCard
                    key={o.zone}
                    zone={o.zone}
                    name={o.label}
                    subtitle={o.zone}
                    initialNow={now}
                    href={`/time-zones/${o.zone}`}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
