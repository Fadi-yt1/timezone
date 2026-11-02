'use client';

import { LocalZoneClock } from '@/components/us/LocalZoneClock';
import { useUsSettings } from '@/components/us/UsSettings';
import { UsZoneClock } from '@/components/tools/UsZoneClock';

export interface StripZone {
  key: string;
  zone: string;
  name: string;
  short: string;
  color: string;
}

/**
 * The strip of live zone faces at the top of the US page.
 *
 * It is a client component only because the reader's own card is optional: the
 * column count changes with it, so the grid has to be decided where the setting
 * is readable. The four US faces themselves are unchanged either way.
 */
export function UsZoneStrip({
  zones,
  initialNow,
}: {
  zones: StripZone[];
  initialNow: number;
}) {
  const { showLocal } = useUsSettings();

  return (
    <section
      aria-label="Current time in each US zone"
      className={`mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 ${
        showLocal ? 'lg:max-w-5xl lg:grid-cols-5' : 'lg:grid-cols-4'
      }`}
    >
      {/* First, because it is the one the reader came in knowing. */}
      {showLocal && <LocalZoneClock initialNow={initialNow} />}
      {zones.map((z) => (
        <UsZoneClock
          key={z.key}
          zone={z.zone}
          name={z.name}
          short={z.short}
          color={z.color}
          initialNow={initialNow}
          compact
        />
      ))}
    </section>
  );
}
