import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { countries } from '@/lib/data';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';
import { formatClock } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Time zones by country',
  description:
    'Every country and territory with its time zones and current local time, from ' +
    'single-zone nations to the countries that span a dozen offsets.',
  alternates: { canonical: '/countries' },
};

export default function CountriesPage() {
  const now = Date.now();
  const multi = countries.filter((c) => c.zones.length > 1).sort((a, b) => b.zones.length - a.zones.length);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Time zones by country"
        lede={`All ${countries.length} countries and territories in the IANA database, with live local time. Most use a single zone; a handful stretch across many.`}
      />

      <div className="shell py-8">
        <section className="mb-12">
          <h2 className="display mb-4 text-2xl font-bold tracking-tight">Countries with several zones</h2>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {multi.slice(0, 12).map((c) => (
              <li key={c.code}>
                <Link href={`/countries/${c.code.toLowerCase()}`} className="card card-hover flex items-center gap-3 p-4">
                  <span aria-hidden="true" className="text-2xl">{c.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block text-xs text-faint">{c.zones.length} time zones</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="display mb-4 text-2xl font-bold tracking-tight">All countries</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((c) => {
              const primary = c.zones[0];
              return (
                <li key={c.code}>
                  <Link
                    href={`/countries/${c.code.toLowerCase()}`}
                    className="card card-hover flex items-center justify-between gap-3 p-3.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true">{c.flag}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                        <span className="block text-[11px] text-faint">
                          {c.zones.length > 1 ? `${c.zones.length} zones` : primary}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="clock block text-sm font-semibold">{formatClock(primary, now)}</span>
                      <span className="clock block text-[11px] text-faint">
                        {formatUtcLabel(offsetMinutes(primary, now))}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
