import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { ZoneHeadline } from '@/components/ZoneDetail';
import { ClockCard } from '@/components/ClockCard';
import { cities, getCountry, zonesForCountry } from '@/lib/data';
import { formatPopulation, relativeFuture } from '@/lib/format';
import { dstState, formatUtcLabel, offsetMinutes } from '@/lib/time';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const c = getCountry(code);
  if (!c) return { title: 'Country not found' };
  return {
    title: `Current time in ${c.name}`,
    description:
      `Current local time in ${c.name}, with all ${c.zones.length} of its time zone` +
      `${c.zones.length === 1 ? '' : 's'}, UTC offsets and daylight saving dates.`,
    alternates: { canonical: `/countries/${c.code.toLowerCase()}` },
  };
}

export default async function CountryPage({ params }: Props) {
  const { code } = await params;
  const country = getCountry(code);
  if (!country) notFound();

  const now = Date.now();
  const zs = zonesForCountry(country.code);
  const primary = zs[0];
  const countryCities = cities
    .filter((c) => c.country === country.code)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, 24);
  const observing = zs.filter((z) => z.usesDst);

  return (
    <>
      <PageHeader
        eyebrow={`${country.flag} ${country.code}`}
        title={`Time in ${country.name}`}
        lede={
          zs.length === 1
            ? `${country.name} uses a single time zone, ${primary.zone}, currently ${formatUtcLabel(offsetMinutes(primary.zone, now))}.`
            : `${country.name} spans ${zs.length} time zones, from ${formatUtcLabel(
                Math.min(...zs.map((z) => offsetMinutes(z.zone, now))),
              )} to ${formatUtcLabel(Math.max(...zs.map((z) => offsetMinutes(z.zone, now))))}.`
        }
      />

      <div className="shell grid gap-6 py-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <ZoneHeadline
            zone={primary.zone}
            name={primary.label}
            initialNow={now}
            lat={primary.lat}
            lon={primary.lon}
          />

          {country.sharesZone && (
            <p className="rounded-lg border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-muted">
              {country.name} has no time zone entry of its own in the IANA database. Its clocks
              have matched{' '}
              <Link href={`/time-zones/${primary.zone}`} className="link">
                {primary.zone}
              </Link>{' '}
              since 1970, so that is the zone to use for {country.name}.
            </p>
          )}

          {zs.length > 1 && (
            <section>
              <h2 className="display mb-3 text-lg font-semibold">
                All {zs.length} time zones in {country.name}
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {zs.map((z) => (
                  <ClockCard
                    key={z.zone}
                    zone={z.zone}
                    name={z.label}
                    subtitle={z.note ?? z.zone}
                    initialNow={now}
                    href={`/time-zones/${z.zone}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <h2 className="display text-lg font-semibold">Daylight saving time</h2>
            {observing.length === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {country.name} does not observe daylight saving time. Its clocks stay on the same
                offset all year.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {observing.length === zs.length
                    ? `All of ${country.name}'s time zones observe daylight saving time.`
                    : `${observing.length} of ${country.name}'s ${zs.length} time zones observe daylight saving time.`}
                </p>
                <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {observing.map((z) => {
                    const st = dstState(z.zone, now);
                    return (
                      <li key={z.zone} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3.5 py-3">
                        <Link href={`/time-zones/${z.zone}`} className="text-sm font-medium text-ink hover:text-accent">
                          {z.label}
                        </Link>
                        <span className="text-xs text-muted">
                          {st.inDst ? 'On summer time' : 'On standard time'}
                          {st.next && ` · changes ${relativeFuture(now, st.next.at)}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="display text-lg font-semibold">Country facts</h2>
            <dl className="mt-3 divide-y divide-line text-sm">
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-faint">ISO code</dt>
                <dd className="font-medium text-ink">{country.code}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-faint">Time zones</dt>
                <dd className="font-medium text-ink">{zs.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-faint">Observes DST</dt>
                <dd className="font-medium text-ink">
                  {observing.length === 0 ? 'No' : observing.length === zs.length ? 'Yes' : 'Partly'}
                </dd>
              </div>
            </dl>
          </section>

          {countryCities.length > 0 && (
            <section className="card p-5">
              <h2 className="display text-lg font-semibold">Major cities</h2>
              <ul className="mt-3 space-y-1">
                {countryCities.map((c) => (
                  <li key={`${c.name}-${c.zone}`} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                    <Link href={`/time-zones/${c.zone}`} className="truncate text-muted hover:text-accent">
                      {c.name}
                    </Link>
                    <span className="shrink-0 text-xs text-faint">
                      {formatPopulation(c.population) ?? c.zone.split('/').pop()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
