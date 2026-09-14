'use client';

import { useNow } from './LiveClock';
import { formatClock, formatDate, hourColor } from '@/lib/format';
import { formatUtcLabel, offsetMinutes, sunTimes, zonedParts } from '@/lib/time';

/** The big live headline clock at the top of a zone or country page. */
export function ZoneHeadline({
  zone,
  name,
  initialNow,
  lat,
  lon,
}: {
  zone: string;
  name: string;
  initialNow: number;
  lat: number | null;
  lon: number | null;
}) {
  const now = useNow(initialNow);
  const parts = zonedParts(zone, now);
  const offset = offsetMinutes(zone, now);
  const sun = lat !== null && lon !== null ? sunTimes(lat, lon, now) : null;

  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: hourColor(parts.hour + parts.minute / 60) }}
      />
      <p className="label">Current local time in {name}</p>
      <p className="clock mt-2 text-5xl font-bold leading-none sm:text-7xl">
        {formatClock(zone, now, { seconds: true })}
      </p>
      <p className="mt-3 text-base text-muted">{formatDate(zone, now)}</p>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <div>
          <dt className="label">UTC offset</dt>
          <dd className="clock mt-1 text-lg font-semibold text-accent">{formatUtcLabel(offset)}</dd>
        </div>
        {sun?.sunrise && (
          <div>
            <dt className="label">Sunrise</dt>
            <dd className="clock mt-1 text-lg font-semibold">{formatClock(zone, sun.sunrise)}</dd>
          </div>
        )}
        {sun?.sunset && (
          <div>
            <dt className="label">Sunset</dt>
            <dd className="clock mt-1 text-lg font-semibold">{formatClock(zone, sun.sunset)}</dd>
          </div>
        )}
        {sun && !sun.sunrise && (
          <div className="sm:col-span-2">
            <dt className="label">Daylight</dt>
            <dd className="mt-1 text-sm text-muted">
              The sun neither rises nor sets here today — polar day or polar night.
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
