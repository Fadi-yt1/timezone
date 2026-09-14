import { allUsZones, usHeight, usShapes, usWidth, zoneColor } from '@/lib/us';
import { UsMapLayer, type UsStateMeta, type ZoneTip } from './UsMapLayer';

const meta: UsStateMeta[] = usShapes.map((s) => ({
  fips: s.fips,
  name: s.name,
  zones: s.zones.length ? s.zones : [s.mapZone],
  split: s.split,
}));

const zoneTips: Record<string, ZoneTip> = Object.fromEntries(
  Object.entries(allUsZones).map(([k, z]) => [k, { short: z.short, zone: z.zone, color: zoneColor(k) }]),
);

// Small or crowded states get their label placed outside the shape instead.
const LABEL_SKIP = new Set(['Rhode Island', 'Delaware', 'District of Columbia', 'Connecticut', 'New Jersey']);

/**
 * US time zone map, Albers USA projection with Alaska and Hawaii as insets.
 * States are filled by the zone covering most of them; split states are hatched
 * so the map never implies a clean boundary where there isn't one.
 */
export function UsMap({ initialNow }: { initialNow: number }) {
  return (
    <UsMapLayer states={meta} zoneTips={zoneTips} initialNow={initialNow}>
      <svg
        viewBox={`0 0 ${usWidth} ${usHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Map of United States time zones by state"
      >
        <defs>
          <pattern id="split-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="rgb(var(--canvas))" opacity="0.001" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgb(var(--canvas))" strokeWidth="2.6" opacity="0.5" />
          </pattern>
        </defs>

        <g>
          {usShapes.map((s) => (
            <path
              key={s.fips}
              d={s.d}
              data-fips={s.fips}
              fill={zoneColor(s.mapZone)}
              stroke="rgb(var(--canvas))"
              strokeWidth="1"
              className="transition-[filter] duration-150 hover:brightness-125"
            >
              <title>{s.name}</title>
            </path>
          ))}
        </g>

        {/* Hatch overlay marking the states that straddle a zone boundary. */}
        <g className="pointer-events-none">
          {usShapes.filter((s) => s.split).map((s) => (
            <path key={`h-${s.fips}`} d={s.d} fill="url(#split-hatch)" stroke="none" />
          ))}
        </g>

        {/* Both label sets ship in the HTML; the toolbar toggles which group shows,
            so switching modes costs no round trip and no extra JS payload. */}
        <g className="pointer-events-none" data-labels="abbr">
          {usShapes.map((s) =>
            s.cx !== undefined && s.usps && !LABEL_SKIP.has(s.name) ? (
              <text
                key={`a-${s.fips}`}
                x={s.cx}
                y={s.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="700"
                fill="#0b1220"
                opacity="0.72"
              >
                {s.usps}
              </text>
            ) : null,
          )}
        </g>
        <g className="pointer-events-none" data-labels="name" style={{ display: 'none' }}>
          {usShapes.map((s) =>
            s.cx !== undefined && s.usps && !LABEL_SKIP.has(s.name) ? (
              <text
                key={`n-${s.fips}`}
                x={s.cx}
                y={s.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9.5"
                fontWeight="700"
                fill="#0b1220"
                opacity="0.78"
              >
                {s.name}
              </text>
            ) : null,
          )}
        </g>
      </svg>
    </UsMapLayer>
  );
}
