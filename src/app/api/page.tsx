import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'JSON API',
  description:
    'A free, key-less JSON API for current time, time zone lookup, conversion, meeting ' +
    'overlap and daylight saving transitions. CORS enabled, no registration.',
  alternates: { canonical: '/api' },
};

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  params: [string, string][];
  example: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/time',
    summary: 'Current time in one or more zones, with offset, DST standing and sun times.',
    params: [
      ['zone', 'Comma-separated IANA names. Defaults to a set of major hubs.'],
      ['at', 'ISO 8601 timestamp or epoch seconds/ms. Defaults to now.'],
    ],
    example: '/api/v1/time?zone=Asia/Tokyo,Europe/Paris',
  },
  {
    method: 'GET',
    path: '/api/v1/zones',
    summary: 'List time zones with their current offsets.',
    params: [
      ['q', 'Substring match on the zone name.'],
      ['country', 'ISO 3166-1 alpha-2 code.'],
      ['region', 'Africa, America, Asia, Europe, Australia, Pacific…'],
      ['include', 'listed (default), utc, or all.'],
    ],
    example: '/api/v1/zones?country=AU',
  },
  {
    method: 'GET',
    path: '/api/v1/zones/{zone}',
    summary: 'Full detail for one zone: cities, countries and DST transitions for two years.',
    params: [['at', 'ISO 8601 timestamp. Defaults to now.']],
    example: '/api/v1/zones/America/New_York',
  },
  {
    method: 'GET',
    path: '/api/v1/convert',
    summary: 'Convert a wall-clock time from one zone into many others.',
    params: [
      ['from', 'Required. Source IANA zone.'],
      ['to', 'Required. Comma-separated target zones.'],
      ['date', 'YYYY-MM-DD in the source zone. Omit for now.'],
      ['time', 'HH:MM, 24-hour, in the source zone.'],
    ],
    example: '/api/v1/convert?from=Europe/London&to=Asia/Tokyo&date=2026-11-02&time=09:00',
  },
  {
    method: 'GET',
    path: '/api/v1/overlap',
    summary: 'Hour-by-hour working-hour overlap across zones — what the meeting planner uses.',
    params: [
      ['zones', 'Required. Comma-separated, up to 12.'],
      ['start / end', 'Working day bounds as hours, 0–24. Defaults 9 and 17.'],
      ['date', 'YYYY-MM-DD in the first zone.'],
    ],
    example: '/api/v1/overlap?zones=Europe/London,Asia/Singapore,America/Los_Angeles',
  },
  {
    method: 'GET',
    path: '/api/v1/countries',
    summary: 'Every country with its zones and current offsets.',
    params: [],
    example: '/api/v1/countries',
  },
  {
    method: 'GET',
    path: '/api/v1/countries/{code}',
    summary: 'One country, with a full time snapshot for each of its zones.',
    params: [['code', 'ISO 3166-1 alpha-2, e.g. BR.']],
    example: '/api/v1/countries/BR',
  },
  {
    method: 'GET',
    path: '/api/v1/dst',
    summary: 'Upcoming daylight saving transitions worldwide, soonest first.',
    params: [['limit', 'Maximum rows, up to 400. Defaults to 100.']],
    example: '/api/v1/dst?limit=20',
  },
  {
    method: 'GET',
    path: '/api/v1/search',
    summary: 'Ranked search across cities, zones and countries.',
    params: [
      ['q', 'Required. Free text.'],
      ['limit', 'Maximum results, up to 40.'],
    ],
    example: '/api/v1/search?q=mumbai',
  },
];

export default function ApiPage() {
  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="JSON API"
        lede="Everything this site renders is available as JSON. No key, no registration, no rate limit beyond ordinary fair use. CORS is open, so you can call it straight from a browser."
      />

      <div className="shell py-8">
        <section className="card mb-8 p-5 sm:p-6">
          <h2 className="display text-lg font-semibold">Base URL</h2>
          <pre className="clock mt-3 overflow-x-auto rounded-lg border border-line bg-canvas p-3.5 text-sm text-accent">
            {site.url}/api/v1
          </pre>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            All endpoints return JSON and accept <code className="text-ink">GET</code>. Errors come
            back as <code className="text-ink">{'{ "error": { "status", "message" } }'}</code> with a
            matching HTTP status. Times are ISO 8601; offsets are given both in minutes and as a
            formatted string.
          </p>
        </section>

        <div className="space-y-4">
          {endpoints.map((e) => (
            <section key={e.path} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-raised px-4 py-3">
                <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-canvas">
                  {e.method}
                </span>
                <code className="clock text-sm font-semibold text-ink">{e.path}</code>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-muted">{e.summary}</p>

                {e.params.length > 0 && (
                  <dl className="mt-4 divide-y divide-line rounded-lg border border-line">
                    {e.params.map(([name, desc]) => (
                      <div key={name} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:gap-4">
                        <dt className="clock w-40 shrink-0 text-xs font-semibold text-accent">{name}</dt>
                        <dd className="text-xs text-muted">{desc}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-4">
                  <p className="label mb-1.5">Example</p>
                  <a
                    href={e.example}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="clock block overflow-x-auto rounded-lg border border-line bg-canvas p-3 text-xs
                               text-muted transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {e.example}
                  </a>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="card mt-8 p-5 sm:p-6">
          <h2 className="display text-lg font-semibold">Fair use</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            This API is offered as-is for hobby projects, prototypes and small applications. It
            reads from the IANA time zone database, which is public domain — so if you need
            guaranteed availability at scale, the right answer is to compute time zones locally
            using your own platform&rsquo;s tz support, exactly as this site does.
          </p>
        </section>
      </div>
    </>
  );
}
