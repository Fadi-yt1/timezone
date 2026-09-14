import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { cities, countries, listedZones } from '@/lib/data';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How Meridian computes local time, daylight saving transitions and sunrise times from ' +
    'the IANA time zone database, and where its map and city data come from.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="How it works"
        lede={`${site.name} is built directly on the public time zone database rather than a hand-kept table of offsets, so it stays correct when the rules change.`}
      />

      <div className="shell grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose-block max-w-3xl">
          <h2>Where the data comes from</h2>
          <p>
            Every offset, abbreviation and daylight saving rule on this site traces back to the{' '}
            <a href="https://www.iana.org/time-zones" className="link" target="_blank" rel="noreferrer noopener">
              IANA time zone database
            </a>{' '}
            — the same dataset that underpins Linux, macOS, Java and the browser you are reading
            this in. It is maintained in the public domain and updated several times a year as
            governments change their rules.
          </p>
          <p>
            Zone coordinates and country assignments come from that database&rsquo;s own{' '}
            <code>zone1970.tab</code> table. Country outlines on the map are Natural Earth data,
            which is also public domain. City populations are approximate metropolitan figures,
            used only for ranking search results and sizing map dots.
          </p>

          <h2>How local time is calculated</h2>
          <p>
            There is no offset table in this codebase. To find the time in a zone, the site asks
            the platform&rsquo;s own tz implementation what the wall-clock reading is for a given
            instant, then derives the offset by comparing that against UTC. Daylight saving falls
            out of this automatically, including for dates in the past and future.
          </p>
          <p>
            Transition dates are found the same way: the site scans forward through a zone&rsquo;s
            timeline looking for the moment its offset changes, then binary-searches that day down
            to the exact second. That is why the dates here match a government&rsquo;s actual rule
            rather than an assumed &ldquo;last Sunday in March&rdquo;.
          </p>

          <h2>Sunrise, sunset and the night side of the map</h2>
          <p>
            Sunrise and sunset are computed from each zone&rsquo;s coordinates using the standard
            NOAA solar position equations, including the −0.833° correction for atmospheric
            refraction and the sun&rsquo;s apparent radius. Where the sun never rises or sets — as
            happens above the Arctic Circle in midsummer — the site says so rather than inventing
            a time.
          </p>
          <p>
            The shaded region on the world map is the real day/night terminator, drawn from the
            current sub-solar point and corrected by the equation of time. It moves as you watch.
          </p>

          <h2>Names and aliases</h2>
          <p>
            Time zones accumulate old names. This site prefers the current spellings — Asia/Kolkata
            over Asia/Calcutta, Europe/Kyiv over Europe/Kiev — while still resolving every
            historical alias, so an old identifier in a bookmark or an API call keeps working and
            redirects to the canonical page.
          </p>

          <h2>Privacy</h2>
          <p>
            There is no analytics, no advertising and no tracking of any kind. The world clock
            remembers your chosen cities in your own browser&rsquo;s local storage; nothing about
            that selection reaches a server.
          </p>
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="display text-lg font-semibold">By the numbers</h2>
            <dl className="mt-3 divide-y divide-line text-sm">
              {[
                ['Time zones', listedZones.length],
                ['Countries', countries.length],
                ['Cities indexed', cities.length],
                ['Zones observing DST', listedZones.filter((z) => z.usesDst).length],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-baseline justify-between py-2.5">
                  <dt className="text-faint">{k}</dt>
                  <dd className="clock font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="display text-lg font-semibold">Built with</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>Next.js App Router with React server components</li>
              <li>TypeScript throughout, no date library</li>
              <li>Tailwind CSS design tokens</li>
              <li>D3 geo projections, pre-rendered to SVG at build time</li>
            </ul>
            <Link href="/api" className="mt-4 inline-block text-sm text-accent hover:underline">
              Use the JSON API &rarr;
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
