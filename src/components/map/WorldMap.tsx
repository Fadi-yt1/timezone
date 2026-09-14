import world from '@/data/world.json';
import { hourColor } from '@/lib/format';
import { nightPath } from '@/lib/terminator';
import { zonedParts } from '@/lib/time';
import { MapLayer, type MapCountry } from './MapLayer';

interface Shape {
  id: string;
  code: string;
  name: string;
  d: string;
  zone: string;
  zoneCount: number;
}

const shapes = world.shapes as Shape[];
const mapCities = world.cities as {
  name: string; zone: string; country: string | null;
  x: number; y: number; population: number | null; primary: boolean;
}[];

const countries: MapCountry[] = shapes.map((s) => ({
  code: s.code,
  name: s.name,
  zone: s.zone,
  zoneCount: s.zoneCount,
}));

/**
 * The world time zone map. Country paths and their first colouring are rendered
 * on the server so the map is a complete picture before any JavaScript runs;
 * MapLayer then keeps it live.
 */
export function WorldMap({
  interactive = true,
  showCities = true,
  className = '',
}: {
  interactive?: boolean;
  showCities?: boolean;
  className?: string;
}) {
  const now = Date.now();
  const { width, height } = world;

  // Hour meridians: one line every 15° of longitude — one hour of solar time.
  const meridians = Array.from({ length: 25 }, (_, i) => (i * width) / 24);
  const cityDots = showCities
    ? mapCities.filter((c) => c.primary || (c.population ?? 0) >= 5_000_000).slice(0, 120)
    : [];

  return (
    <MapLayer countries={countries} width={width} height={height} interactive={interactive}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full ${className}`}
        role="img"
        aria-label="World map coloured by the current local time in each country"
      >
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--surface))" />
            <stop offset="100%" stopColor="rgb(var(--canvas))" />
          </linearGradient>
        </defs>

        <rect width={width} height={height} fill="url(#ocean)" />

        <g stroke="rgb(var(--line))" strokeWidth="0.5" opacity="0.5">
          {meridians.map((x, i) => (
            <line key={i} x1={x} y1="0" x2={x} y2={height} />
          ))}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} strokeWidth="0.8" />
        </g>

        <g id="world-map-shapes">
          {shapes.map((s) => {
            const p = zonedParts(s.zone, now);
            return (
              <path
                key={s.id}
                d={s.d}
                data-code={s.code}
                fill={hourColor(p.hour + p.minute / 60)}
                stroke="rgb(var(--canvas))"
                strokeWidth="0.4"
                className="transition-[fill] duration-700 hover:brightness-125"
              >
                <title>{`${s.name} — ${s.zone}`}</title>
              </path>
            );
          })}
        </g>

        {/* Night side, drawn over the countries it darkens. */}
        <path
          id="world-map-night"
          d={nightPath(width, height, now)}
          className="night-veil pointer-events-none"
        />

        {cityDots.length > 0 && (
          <g className="pointer-events-none">
            {cityDots.map((c) => (
              <circle
                key={`${c.name}-${c.zone}`}
                cx={c.x}
                cy={c.y}
                r={(c.population ?? 0) >= 10_000_000 ? 2.1 : 1.4}
                fill="rgb(var(--ink))"
                opacity="0.55"
              />
            ))}
          </g>
        )}
      </svg>
    </MapLayer>
  );
}
