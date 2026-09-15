import Link from 'next/link';
import type { Metadata } from 'next';
import { WorldMap } from '@/components/map/WorldMap';
import { MapLegend } from '@/components/map/MapLegend';
import { ClockCard } from '@/components/ClockCard';
import { SearchBox } from '@/components/SearchBox';
import { featuredCities, listedZones, countries } from '@/lib/data';
import { UsZonesHome } from '@/components/us/UsZonesHome';
import { PrintableMaps } from '@/components/us/PrintableMaps';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: '/' },
};

const tools = [
  {
    href: '/converter',
    title: 'Time zone converter',
    body: 'Pick a time in one city and read it off in as many others as you like.',
    icon: 'M7 8h10M7 12h6m-6 4h10M4 4h16v16H4z',
  },
  {
    href: '/meeting-planner',
    title: 'Meeting planner',
    body: 'Line up working hours across teams and see the overlap as a single grid.',
    icon: 'M4 8h16M8 3v3m8-3v3M5 5h14v15H5zM9 13h2m4 0h2M9 17h2',
  },
  {
    href: '/world-clock',
    title: 'World clock',
    body: 'A live wall of clocks for the cities you actually care about.',
    icon: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    href: '/dst',
    title: 'Daylight saving',
    body: 'Which countries change their clocks next, and exactly when.',
    icon: 'M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  },
];

export default function HomePage() {
  const now = Date.now();

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="shell py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="label mb-3">Live · {listedZones.length} time zones · {countries.length} countries</p>
            <h1 className="display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              What time is it{' '}
              <span className="text-accent">everywhere</span>?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              An interactive map of the world&rsquo;s time zones, with a converter, a meeting
              planner and daylight saving dates — all built straight on the IANA time zone
              database.
            </p>
            <div className="mt-7 max-w-lg">
              <SearchBox size="lg" placeholder="Try “Tokyo”, “Brazil” or “UTC+5:30”…" />
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-10">
        <div className="card overflow-hidden">
          <div className="relative aspect-[2/1] w-full bg-canvas">
            <WorldMap />
          </div>
          <div className="border-t border-line px-4 py-3.5 sm:px-5">
            <MapLegend />
          </div>
        </div>
        <p className="mt-3 text-xs text-faint">
          Hover a country for its local time; click through for its full time zone breakdown. The
          shaded half of the map is the side of the planet currently in darkness.
        </p>
      </section>

      <section className="shell py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="display text-2xl font-bold tracking-tight">Right now around the world</h2>
            <p className="mt-1 text-sm text-muted">Live local time in the world&rsquo;s major hubs.</p>
          </div>
          <Link href="/world-clock" className="shrink-0 text-sm font-medium text-accent hover:underline">
            Build your own &rarr;
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredCities.slice(0, 12).map((c) => (
            <ClockCard
              key={c.zone}
              zone={c.zone}
              name={c.name}
              subtitle={c.countryName ?? c.zone}
              initialNow={now}
              href={`/time-zones/${c.zone}`}
            />
          ))}
        </div>
      </section>

      <UsZonesHome initialNow={now} />

      <div className="shell">
        <PrintableMaps />
      </div>

      <section className="shell py-10">
        <h2 className="display mb-5 text-2xl font-bold tracking-tight">Tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="card card-hover group p-5">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={t.icon} />
              </svg>
              <h3 className="mt-3.5 font-semibold text-ink">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell pb-6 pt-4">
        <div className="card grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
          <div>
            <p className="display text-3xl font-bold text-accent">{listedZones.length}</p>
            <p className="mt-1 text-sm text-muted">IANA time zones, each with live local time</p>
          </div>
          <div>
            <p className="display text-3xl font-bold text-accent">{countries.length}</p>
            <p className="mt-1 text-sm text-muted">Countries and territories covered</p>
          </div>
          <div>
            <p className="display text-3xl font-bold text-accent">
              {listedZones.filter((z) => z.usesDst).length}
            </p>
            <p className="mt-1 text-sm text-muted">Zones that still change their clocks</p>
          </div>
        </div>
      </section>
    </>
  );
}
