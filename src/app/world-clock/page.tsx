import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { WorldClock } from '@/components/tools/WorldClock';
import { featuredCities } from '@/lib/data';

export const metadata: Metadata = {
  title: 'World clock',
  description:
    'A live wall of clocks for any cities you choose. Add, remove and reorder them; your ' +
    'selection is remembered in your browser.',
  alternates: { canonical: '/world-clock' },
};

export default function WorldClockPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="World clock"
        lede="Keep the cities you work with on one screen, ticking in real time. Your selection is saved in this browser, so it is there next time."
      />
      <div className="shell py-8">
        <WorldClock
          initialNow={Date.now()}
          defaults={featuredCities.slice(0, 8).map((c) => ({ zone: c.zone, title: c.name }))}
        />
      </div>
    </>
  );
}
