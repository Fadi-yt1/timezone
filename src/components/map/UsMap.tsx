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
  // Puerto Rico sits low and to the right, as its own inset.
  PR: 527,
};
const LEADER_X = 990;
/** Extra canvas to the right of the map for the leader-label column. */
const GUTTER = 165;

/**
 * US time zone map, Albers USA projection with Alaska and Hawaii as insets.
 * States are filled by the zone covering most of them.
 */
export function UsMap({
  initialNow,
  detail = 'full',
}: {
  initialNow: number;
  /** 'lite' swaps in simplified geometry — a third of the bytes, for teasers. */
  detail?: 'full' | 'lite';
}) {
  // Both maps can appear on one page, so the base paths the outlines point at
  // need ids that do not collide between them.
  const idBase = detail === 'lite' ? 'usl' : 'usf';
  return (
    <UsMapLayer states={meta} zoneTips={zoneTips} initialNow={initialNow}>
      <svg
        viewBox={`0 0 ${usWidth + GUTTER} ${usHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Map of United States time zones by state"
      >
        <g>
          {usShapes.map((s) =>
            s.parts ? (
              // A zone boundary crosses this state. Fill the whole state in the
              // zone holding most of its counties, then lay the remaining zones
              // over it as shapes merged from their own counties. None of these
              // is stroked, so a zone change reads as a change of colour rather
              // than a line drawn through the state; the border is picked up
              // from the base path by the <use> group below.
              //
              // Fill comes from this wrapper rather than the path, so that the
              // <use> instance can override it: a presentation attribute set on
              // the path itself would survive into the instance and paint over
              // the map.
              <g key={s.fips} fill={zoneColor(s.parts[0].zone)}>
                <path
                  id={`${idBase}-${s.fips}`}
                  d={detail === 'lite' ? (s.dLite ?? s.d) : s.d}
                  data-fips={s.fips}
                  data-nostroke="true"
                  className="transition-[filter] duration-150 hover:brightness-125"
                >
                  <title>{s.name}</title>
                </path>
                {s.parts.slice(1).map((part) => (
                  <path
                    key={part.zone}
                    d={detail === 'lite' ? part.dLite : part.d}
                    data-fips={s.fips}
                    data-nostroke="true"
                    fill={zoneColor(part.zone)}
                    stroke="none"
                    className="transition-[filter] duration-150 hover:brightness-125"
                  >
                    <title>{s.name}</title>
                  </path>
                ))}
              </g>
            ) : (
              <path
                key={s.fips}
                d={detail === 'lite' ? (s.dLite ?? s.d) : s.d}
                data-fips={s.fips}
                fill={zoneColor(s.mapZone)}
                stroke="rgb(var(--canvas))"
                strokeWidth="1"
                className="transition-[filter] duration-150 hover:brightness-125"
              >
                <title>{s.name}</title>
              </path>
            ),
          )}
        </g>

        {/* Split states carry no stroke on their fills, so their borders are
            drawn here, over the top. Each one re-uses the base path it was
            filled with, so a state outline costs a tag rather than a second
            copy of its geometry — about 34 KB across the twelve of them. */}
        <g>
          {usShapes
            .filter((s) => s.parts)
            .map((s) => (
              <use
                key={`${s.fips}-outline`}
                href={`#${idBase}-${s.fips}`}
                data-fips={s.fips}
                fill="none"
                stroke="rgb(var(--canvas))"
                strokeWidth="1"
              />
            ))}
        </g>

        {/* Both label sets ship in the HTML; the toolbar toggles which group shows,
            so switching modes costs no round trip and no extra JS payload.
            Text is bound to --ink so it stays legible in either theme. */}
        <g className="pointer-events-none" data-labels="abbr" fill="rgb(var(--ink))">
          {usShapes.map((s) => {
            if (s.cx === undefined || !s.usps) return null;
            const ly = LEADER[s.usps];
            return ly === undefined ? (
              <text
                key={`a-${s.fips}`}
                x={s.cx}
                y={s.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="700"
              >
                {s.usps}
              </text>
            ) : (
              <text key={`al-${s.fips}`} x={LEADER_X} y={ly} fontSize="12" fontWeight="700" textAnchor="start">
                {s.usps}
              </text>
            );
          })}
        </g>

        <g
          className="pointer-events-none"
          data-labels="name"
          fill="rgb(var(--ink))"
          style={{ display: 'none' }}
        >
          {usShapes.map((s) => {
            if (s.cx === undefined || !s.usps) return null;
            const ly = LEADER[s.usps];
            return ly === undefined ? (
              <text
                key={`n-${s.fips}`}
                x={s.cx}
                y={s.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9.5"
                fontWeight="700"
              >
                {s.name}
              </text>
            ) : (
              <text key={`nl-${s.fips}`} x={LEADER_X} y={ly} fontSize="10.5" fontWeight="700" textAnchor="start">
                {s.name}
              </text>
            );
          })}
        </g>

        {/* The leader lines are shared by both naming modes. */}
        <g className="pointer-events-none" data-labels="leaderlines">
          {usShapes.map((s) =>
            s.cx !== undefined && s.usps && LEADER[s.usps] !== undefined ? (
              <line
                key={`ll-${s.fips}`}
                x1={s.cx}
                y1={s.cy}
                x2={LEADER_X - 6}
                y2={LEADER[s.usps] - 4}
                stroke="rgb(var(--muted))"
                strokeWidth="0.8"
              />
            ) : null,
          )}
        </g>
      </svg>
    </UsMapLayer>
  );
}
