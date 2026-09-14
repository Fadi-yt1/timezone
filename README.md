# Meridian

An interactive world time zone map, converter and meeting planner, built directly on the
public IANA time zone database.

Every offset, abbreviation and daylight-saving rule is computed from the platform's own tz
implementation at request time — there is no hand-maintained offset table anywhere in this
repository, so the site stays correct when governments change their rules and the tz
database is updated.

## What's here

**Tools**

- **World map** — an equirectangular projection where each country is tinted by the hour its
  clocks currently read, overlaid with the real day/night terminator computed from the
  sub-solar point.
- **Converter** — a wall-clock time in one zone, read off in any number of others, for any
  date (so daylight saving is applied for the date you actually chose).
- **Meeting planner** — a 24-hour grid of every participant's local clock, highlighting the
  hours that fall inside working hours for the whole group.
- **World clock** — a live wall of clocks, remembered in the browser's local storage.

**Reference pages** for all 312 geographic zones, 247 countries, every UTC offset in use, and
upcoming daylight-saving transitions worldwide.

**A JSON API** at `/api/v1` — key-less, CORS-open, documented at `/api`.

## How local time is computed

`src/lib/time.ts` is the whole of it, and it has no dependencies:

- **Offsets** come from formatting an instant in the target zone and differencing the result
  against UTC. Daylight saving falls out automatically, for past and future dates alike.
- **Transitions** are found by scanning a zone's timeline day by day for a change in offset,
  then binary-searching that day down to the second and snapping to the minute boundary the
  change actually lands on.
- **Sunrise and sunset** use the NOAA solar equations, including the −0.833° correction for
  refraction and the solar disc. Polar day and polar night are reported as such rather than
  fabricated.
- **The terminator** is derived from the sub-solar point, corrected by the equation of time.

`tests/run.sh` checks all of this against known tzdb facts — 37 assertions covering offsets,
half-hour and 45-minute zones, DST transition instants, round-tripping wall-clock times, and
solar positions at the solstice and equinox.

## Data

| Source | Used for | Licence |
| --- | --- | --- |
| IANA tz database (`zone1970.tab`, `iso3166.tab`) | Zones, coordinates, country codes | Public domain |
| Natural Earth via `world-atlas` | Country outlines | Public domain |
| Curated city list (`scripts/cities.tsv`) | Search ranking, map dots | Approximate public figures |

Regenerate the derived datasets after a tzdb update:

```bash
npm run data     # zones, countries, cities, aliases
node scripts/build-map.mjs   # projected SVG paths
```

Zone names prefer current spellings (`Asia/Kolkata`, `Europe/Kyiv`) while every historical
alias still resolves and redirects to the canonical page.

## Development

```bash
npm install
npm run data && node scripts/build-map.mjs   # generate src/data/*.json
npm run dev                                   # http://localhost:3000
./tests/run.sh                                # time library assertions
npm run build                                 # production build
```

## Stack

Next.js App Router with React server components, TypeScript, Tailwind CSS. No date library.
Country paths are projected to SVG at build time with d3-geo and rendered server-side, so the
map's ~180 KB of geometry stays in the HTML instead of the JavaScript bundle — first load is
around 110 KB.

Deployed on Netlify via `@netlify/plugin-nextjs`.
