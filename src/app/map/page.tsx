import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldMap } from '@/components/map/WorldMap';
import { MapLegend } from '@/components/map/MapLegend';
import { PageHeader } from '@/components/PageHeader';
import { offsetGroups } from '@/lib/data';
import { formatUtcLabel, offsetMinutes } from '@/lib/time';
import { offsetHref } from '@/lib/format';

export const metadata: Metadata = {
  title: 'World time zone map',
  description:
    'An interactive world time zone map showing the current local time in every country, ' +
    'with the day/night terminator and hour meridians drawn to scale.',
  alternates: { canonical: '/map' },
};

export default function MapPage() {
  const now = Date.now();
  const groups = offsetGroups();

  return (
    <>
      <PageHeader
        eyebrow="Map"
        title="World time zone map"
        lede="Every country is tinted by the hour its clocks currently read — midnight in deep indigo through to midday in amber. The shaded half of the globe is the side in darkness right now."
      />

      <div className="shell py-8">
        <div className="card overflow-hidden">
          <div className="relative aspect-[2/1] w-full bg-canvas">
            <WorldMap />
          </div>
          <div className="border-t border-line px-4 py-3.5 sm:px-5">
            <MapLegend />
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-3">
          <p className="card p-4">
            <strong className="block text-ink">Hover</strong>
            Read a country&rsquo;s current local time and UTC offset.
          </p>
          <p className="card p-4">
            <strong className="block text-ink">Click</strong>
            Open that country&rsquo;s full time zone breakdown.
          </p>
          <p className="card p-4">
            <strong className="block text-ink">Vertical lines</strong>
            Every 15° of longitude — one hour of solar time.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="display text-2xl font-bold tracking-tight">Browse by UTC offset</h2>
          <p className="mt-1.5 text-sm text-muted">
            The world currently spans {groups.length} distinct standard offsets, from{' '}
            {formatUtcLabel(groups[0].offset)} to {formatUtcLabel(groups[groups.length - 1].offset)}.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const sample = g.zones.slice(0, 3);
              return (
                <Link key={g.offset} href={offsetHref(g.offset)} className="card card-hover p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="clock font-bold text-accent">{formatUtcLabel(g.offset)}</span>
                    <span className="text-xs text-faint">{g.zones.length} zones</span>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted">
                    {sample.map((z) => z.label).join(', ')}
                    {g.zones.length > 3 ? ` +${g.zones.length - 3}` : ''}
                  </p>
                  <p className="clock mt-2 text-lg font-semibold">
                    {(() => {
                      const off = offsetMinutes(g.zones[0].zone, now);
                      const shifted = new Date(now + off * 60000);
                      return `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(
                        shifted.getUTCMinutes(),
                      ).padStart(2, '0')}`;
                    })()}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
