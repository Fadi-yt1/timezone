import Link from 'next/link';
import { UsMap } from '@/components/map/UsMap';
import { UsZoneClock } from '@/components/tools/UsZoneClock';
import { UsSettingsProvider } from './UsSettings';
import { continentalZones, zoneColor } from '@/lib/us';

/**
 * Condensed US section for the home page: the four continental zone clocks over
 * an interactive map, linking through to the full page.
 *
 * The map runs at 'lite' detail. The home page already carries the world map,
 * and the detailed US geometry is 154 KB of path data on its own; the
 * simplified variant is 42 KB and indistinguishable at this size.
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

        <div className="card mt-5 overflow-hidden">
          <div className="relative aspect-[16/10] w-full bg-canvas">
            <UsMap initialNow={initialNow} detail="lite" />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3.5 sm:px-5">
            <span className="label">Zones</span>
            {continentalZones.map((z) => (
              <span key={z.key} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-3 w-4 rounded-sm" style={{ background: zoneColor(z.key) }} />
                {z.name}
              </span>
            ))}
          </div>
        </div>
      </UsSettingsProvider>
    </section>
  );
}
