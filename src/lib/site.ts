export const site = {
  name: 'Meridian',
  tagline: 'World time zone map, converter and meeting planner',
  description:
    'An interactive world time zone map with live local times for every IANA zone, a ' +
    'time zone converter, a meeting planner that finds overlapping working hours, and ' +
    'daylight saving transition dates for 240+ countries.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fadi-yt1.github.io/timezone',
} as const;

export const nav = [
  { href: '/map', label: 'World map' },
  { href: '/converter', label: 'Converter' },
  { href: '/meeting-planner', label: 'Meeting planner' },
  { href: '/world-clock', label: 'World clock' },
  { href: '/us-time-zones', label: 'US zones' },
  { href: '/time-zones', label: 'Time zones' },
  { href: '/dst', label: 'DST' },
] as const;
