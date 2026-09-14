import Link from 'next/link';
import { UsZoneClock } from '@/components/tools/UsZoneClock';
import { UsSettingsProvider } from './UsSettings';
import { continentalZones, zoneColor } from '@/lib/us';

/**
 * Condensed US section for the home page: the four continental zone clocks and
 * a link through to the full page.
 *
 * Deliberately no map here. The interactive US map is ~169 KB of path data and
 * the home page already carries the world map; rendering both pushed the page
 * from 158 KB to 297 KB gzipped. The printable maps section directly below
 * supplies the US visual, and the full map lives one click away.
 */
export function UsZonesHome({ initialNow }: { initialNow: number }) {
  return (
    <section className="shell py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-2xl font-bold tracking-tight">US time zones</h2>
          <p className="mt-1 text-sm text-muted">
            Pacific, Mountain, Central and Eastern — live, with every state mapped.
          </p>
        </div>
        <Link href="/us-time-zones" className="shrink-0 text-sm font-medium text-accent hover:underline">
          All 50 states &amp; DST dates &rarr;
        </Link>
      </div>

      <UsSettingsProvider>
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {continentalZones.map((z) => (
            <UsZoneClock
              key={z.key}
              zone={z.zone}
              name={z.name}
              short={z.short}
              color={zoneColor(z.key)}
              initialNow={initialNow}
              compact
            />
          ))}
        </div>

      </UsSettingsProvider>
    </section>
  );
}
