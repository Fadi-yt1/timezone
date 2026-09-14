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

// The northeast is far too crowded for centroid labels, so these nine run out
// to a column on the right on a leader line — same treatment as the printables.
const LEADER: Record<string, number> = {
  VT: 96, NH: 118, MA: 140, RI: 162, CT: 184, NJ: 208, DE: 230, MD: 252, DC: 274,
};
const LEADER_X = 944;

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

        {/* Both label sets ship in the HTML; the toolbar toggles which group shows,
            so switching modes costs no round trip and no extra JS payload. */}
        <g className="pointer-events-none" data-labels="abbr">
          {usShapes.map((s) =>
            s.cx !== undefined && s.usps && LEADER[s.usps] === undefined ? (
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
            s.cx !== undefined && s.usps && LEADER[s.usps] === undefined ? (
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
        {/* Leader labels serve both modes: the full names would not fit here. */}
        <g className="pointer-events-none" data-labels="leader">
          {usShapes.map((s) =>
            s.cx !== undefined && s.usps && LEADER[s.usps] !== undefined ? (
              <g key={`ld-${s.fips}`}>
                <line
                  x1={s.cx}
                  y1={s.cy}
                  x2={LEADER_X - 5}
                  y2={LEADER[s.usps] - 4}
                  stroke="rgb(var(--muted))"
                  strokeWidth="0.8"
                />
                <text
                  x={LEADER_X}
                  y={LEADER[s.usps]}
                  fontSize="12"
                  fontWeight="700"
                  fill="rgb(var(--ink))"
                  textAnchor="start"
                >
                  {s.usps}
                </text>
              </g>
            ) : null,
          )}
        </g>
      </svg>
    </UsMapLayer>
  );
}
