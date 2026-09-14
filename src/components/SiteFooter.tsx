import Link from 'next/link';
import { Logo } from './Logo';
import { site } from '@/lib/site';

const groups = [
  {
    title: 'Tools',
    links: [
      { href: '/map', label: 'World time zone map' },
      { href: '/converter', label: 'Time zone converter' },
      { href: '/meeting-planner', label: 'Meeting planner' },
      { href: '/world-clock', label: 'World clock' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { href: '/us-time-zones', label: 'US time zones' },
      { href: '/time-zones', label: 'All time zones' },
      { href: '/countries', label: 'Countries' },
      { href: '/utc-offset', label: 'UTC offsets' },
      { href: '/dst', label: 'Daylight saving time' },
    ],
  },
  {
    title: 'About',
    links: [
      { href: '/about', label: 'How it works' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <span className="display font-bold">{site.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-faint">
            Live local time for every time zone in the world.
          </p>
        </div>

        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="label">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="shell flex py-5 text-xs text-faint">
          <p>© {new Date().getUTCFullYear()} {site.name}</p>
        </div>
      </div>
    </footer>
  );
}
