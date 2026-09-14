import type { MetadataRoute } from 'next';
import { countries, listedZones, offsetGroups, utcZones } from '@/lib/data';
import { offsetHref } from '@/lib/format';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const url = (path: string) => `${site.url}${path}`;

  const staticPages = [
    '', '/map', '/converter', '/meeting-planner', '/world-clock',
    '/us-time-zones', '/time-zones', '/countries', '/utc-offset', '/dst', '/about', '/api',
  ].map((p) => ({
    url: url(p || '/'),
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : 0.8,
  }));

  return [
    ...staticPages,
    ...[...listedZones, ...utcZones].map((z) => ({
      url: url(`/time-zones/${z.zone}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...countries.map((c) => ({
      url: url(`/countries/${c.code.toLowerCase()}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...offsetGroups().map((g) => ({
      url: url(offsetHref(g.offset)),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  ];
}
