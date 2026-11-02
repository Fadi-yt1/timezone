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

// The northeast is far too crowded for centroid labels, so these states are set
// beside the map and tied back to it with a leader line ending in a dot.
//
// They are placed per state rather than in one aligned column: kept close to
// the coastline they belong to, and split into the two clusters the geography
// already suggests — New England above, the mid-Atlantic below. A single column
// far to the right needs much longer lines, which cross each other and push the
// map itself into a corner of the frame.
interface Leader {
  x: number;
  y: number;
  /** 'middle' for a label set above its state, 'start' for one set beside it. */
  anchor: 'start' | 'middle';
}

const LEADER: Record<string, Leader> = {
  // Vermont is the one with clear air directly above it, so it goes there and
  // drops a line straight down, as on a printed atlas.
  VT: { x: 884, y: 44, anchor: 'middle' },
  NH: { x: 954, y: 112, anchor: 'start' },
  MA: { x: 954, y: 134, anchor: 'start' },
  RI: { x: 954, y: 156, anchor: 'start' },
  CT: { x: 954, y: 178, anchor: 'start' },
  NJ: { x: 934, y: 208, anchor: 'start' },
  DE: { x: 934, y: 230, anchor: 'start' },
  MD: { x: 934, y: 252, anchor: 'start' },
  DC: { x: 934, y: 274, anchor: 'start' },
  // Puerto Rico sits low and to the right, as its own inset.
  PR: { x: 905, y: 530, anchor: 'start' },
};

/** Where a leader line stops so it reaches its label without touching it. */
function leaderEnd(l: Leader) {
  return l.anchor === 'middle'
    ? { x: l.x, y: l.y + 5 }
    : { x: l.x - 5, y: l.y - 4 };
}

/** Extra canvas to the right of the map for the leader labels. */
const GUTTER = 110;

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
        <g className="map-relief">
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
            const l = LEADER[s.usps];
            return l === undefined ? (
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
              <text key={`al-${s.fips}`} x={l.x} y={l.y} fontSize="12" fontWeight="700" textAnchor={l.anchor}>
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
            const l = LEADER[s.usps];
            return l === undefined ? (
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
              <text key={`nl-${s.fips}`} x={l.x} y={l.y} fontSize="10.5" fontWeight="700" textAnchor={l.anchor}>
                {s.name}
              </text>
            );
          })}
        </g>

        {/* Leader lines, shared by both naming modes. Each ends in a dot on the
            state it names: without it the line just points into a patch of
            colour and leaves which state ambiguous among neighbours this
            small. */}
        <g className="pointer-events-none" data-labels="leaderlines">
          {usShapes.map((s) => {
            if (s.cx === undefined || !s.usps) return null;
            const l = LEADER[s.usps];
            if (l === undefined) return null;
            const end = leaderEnd(l);
            return (
              <g key={`ll-${s.fips}`}>
                <line
                  x1={s.cx}
                  y1={s.cy}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgb(var(--ink))"
                  strokeWidth="0.7"
                  opacity="0.55"
                />
                <circle cx={s.cx} cy={s.cy} r="1.7" fill="rgb(var(--ink))" opacity="0.75" />
              </g>
            );
          })}
        </g>
      </svg>
    </UsMapLayer>
  );
}
