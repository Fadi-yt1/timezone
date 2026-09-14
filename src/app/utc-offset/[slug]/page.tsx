import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { ClockCard } from '@/components/ClockCard';
import { countriesForZone, listedZones, offsetGroups } from '@/lib/data';
import { offsetHref, parseOffsetSlug } from '@/lib/format';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offset = parseOffsetSlug(slug);
  if (offset === null) return { title: 'Offset not found' };
  const label = formatUtcLabel(offset);
  return {
    title: `${label} — time zones and current time`,
    description: `Which countries and time zones are on ${label} right now, what the local time is there, and which of them change their clocks for daylight saving.`,
    alternates: { canonical: offsetHref(offset) },
  };
}

export default async function OffsetPage({ params }: Props) {
  const { slug } = await params;
  const offset = parseOffsetSlug(slug);
  if (offset === null) notFound();

  const now = Date.now();
  const label = formatUtcLabel(offset);
  // Zones whose *current* offset matches, which is what a reader means by "on UTC+2 now".
  const currentlyHere = listedZones.filter((z) => offsetMinutes(z.zone, now) === offset);
  const standardHere = listedZones.filter((z) => z.stdOffset === offset);
  if (!currentlyHere.length && !standardHere.length) notFound();

  const countryNames = [
    ...new Set(currentlyHere.flatMap((z) => countriesForZone(z).map((c) => `${c.flag} ${c.name}`))),
  ].sort();
  const groups = offsetGroups();
  const idx = groups.findIndex((g) => g.offset === offset);

  return (
    <>
      <PageHeader
        eyebrow="UTC offset"
        title={label}
        lede={`${currentlyHere.length} time zone${currentlyHere.length === 1 ? ' is' : 's are'} on ${label} right now, covering ${countryNames.length} countries and territories.`}
      />

      <div className="shell py-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {idx > 0 && (
            <Link href={offsetHref(groups[idx - 1].offset)} className="btn">
              &larr; {formatUtcLabel(groups[idx - 1].offset)}
            </Link>
          )}
          <Link href="/utc-offset" className="btn">All offsets</Link>
          {idx >= 0 && idx < groups.length - 1 && (
            <Link href={offsetHref(groups[idx + 1].offset)} className="btn">
              {formatUtcLabel(groups[idx + 1].offset)} &rarr;
            </Link>
          )}
        </div>

        {currentlyHere.length > 0 && (
          <section className="mb-10">
            <h2 className="display mb-4 text-2xl font-bold tracking-tight">
              Currently on {label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentlyHere.slice(0, 24).map((z) => (
                <ClockCard
                  key={z.zone}
                  zone={z.zone}
                  name={z.label}
                  subtitle={z.zone}
                  initialNow={now}
                  href={`/time-zones/${z.zone}`}
                />
              ))}
            </div>
            {currentlyHere.length > 24 && (
              <p className="mt-4 text-sm text-faint">
                and {currentlyHere.length - 24} more zones.
              </p>
            )}
          </section>
        )}

        {countryNames.length > 0 && (
          <section className="mb-10">
            <h2 className="display mb-4 text-2xl font-bold tracking-tight">
              Countries on {label}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {countryNames.map((n) => (
                <li key={n} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5 sm:p-6">
          <h2 className="display text-lg font-semibold">About {label}</h2>
          <div className="prose-block mt-3 max-w-3xl">
            <p>
              {label} means local clocks read{' '}
              {offset === 0
                ? 'the same as Coordinated Universal Time'
                : `${Math.floor(Math.abs(offset) / 60)} hour${Math.abs(offset) >= 120 ? 's' : ''}${
                    Math.abs(offset) % 60 ? ` and ${Math.abs(offset) % 60} minutes` : ''
                  } ${offset > 0 ? 'ahead of' : 'behind'} Coordinated Universal Time`}
              .{' '}
              {standardHere.length !== currentlyHere.length &&
                `Some zones sit here only part of the year: ${standardHere.length} use ${label} as their standard offset, while ${currentlyHere.length} are on it today because of daylight saving.`}
            </p>
            {Math.abs(offset) % 60 !== 0 && (
              <p>
                This is one of the offsets that is not a whole number of hours. A handful of
                places — India, Iran, parts of Australia and Nepal among them — sit on a 30 or 45
                minute boundary, usually because their local solar time fell awkwardly between two
                hourly meridians.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
