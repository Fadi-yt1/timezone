import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { listedZones, utcZones } from '@/lib/data';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';
import { formatClock } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'All time zones',
  description:
    'Every time zone in the IANA database, grouped by region, with its current local time, ' +
    'UTC offset and whether it observes daylight saving time.',
  alternates: { canonical: '/time-zones' },
};

export default function TimeZonesPage() {
  const now = Date.now();
  const regions = [...new Set(listedZones.map((z) => z.region))].sort();

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="All time zones"
        lede={`Every one of the ${listedZones.length} geographic zones in the IANA time zone database, with live local time. Zone names are the canonical IANA identifiers you would use in code.`}
      >
        <div className="max-w-lg">
          <SearchBox placeholder="Jump to a zone or city…" />
        </div>
      </PageHeader>

      <div className="shell py-8">
        <nav aria-label="Regions" className="mb-8 flex flex-wrap gap-2">
          {regions.map((r) => (
            <a key={r} href={`#${r.toLowerCase()}`} className="btn px-3 py-1.5 text-xs">
              {r}
            </a>
          ))}
          <a href="#utc" className="btn px-3 py-1.5 text-xs">UTC &amp; fixed</a>
        </nav>

        {regions.map((region) => {
          const zs = listedZones
            .filter((z) => z.region === region)
            .sort((a, b) => a.zone.localeCompare(b.zone));
          return (
            <section key={region} id={region.toLowerCase()} className="mb-12 scroll-mt-24">
              <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
                <h2 className="display text-2xl font-bold tracking-tight">{region}</h2>
                <span className="text-sm text-faint">{zs.length} zones</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {zs.map((z) => {
                  const off = offsetMinutes(z.zone, now);
                  return (
                    <li key={z.zone}>
                      <Link href={`/time-zones/${z.zone}`} className="card card-hover flex items-center justify-between gap-3 p-3.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{z.label}</span>
                          <span className="block truncate text-[11px] text-faint">
                            {z.zone}
                            {z.note ? ` · ${z.note}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="clock block text-sm font-semibold">{formatClock(z.zone, now)}</span>
                          <span className="clock block text-[11px] text-faint">{formatUtcLabel(off)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section id="utc" className="scroll-mt-24">
          <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
            <h2 className="display text-2xl font-bold tracking-tight">UTC &amp; fixed offsets</h2>
            <span className="text-sm text-faint">{utcZones.length} zones</span>
          </div>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            These zones never change: they have no daylight saving rule and no geographic
            territory. Note the sign convention — <code className="text-ink">Etc/GMT+5</code> is
            five hours <em>behind</em> UTC, because the POSIX standard inverts the sign.
          </p>
          <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {utcZones.map((z) => (
              <li key={z.zone}>
                <Link href={`/time-zones/${z.zone}`} className="card card-hover flex items-center justify-between gap-2 p-3">
                  <span className="truncate text-sm font-medium">{z.zone}</span>
                  <span className="clock shrink-0 text-xs text-accent">
                    {formatUtcLabel(z.stdOffset)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
