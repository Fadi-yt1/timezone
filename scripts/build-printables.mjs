// Generates standalone, print-ready US time zone maps into public/printables/.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public/printables');
fs.mkdirSync(OUT, { recursive: true });

const us = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/us.json'), 'utf8'));
const { shapes, width: MW, height: MH } = us;

const ZONES = [
  { key: 'pacific',  label: 'Pacific',  color: '#3f8ed0', grey: '#d8d8d8' },
  { key: 'mountain', label: 'Mountain', color: '#8a6fd2', grey: '#b9b9b9' },
  { key: 'central',  label: 'Central',  color: '#d9803c', grey: '#999999' },
  { key: 'eastern',  label: 'Eastern',  color: '#c4544e', grey: '#777777' },
  { key: 'arizona',  label: 'Arizona (no DST)', color: '#a8762f', grey: '#a8a8a8' },
  { key: 'alaska',   label: 'Alaska',   color: '#4a9e8c', grey: '#c6c6c6' },
  { key: 'hawaii',   label: 'Hawaii',   color: '#6d7fa8', grey: '#e2e2e2' },
  { key: 'atlantic', label: 'Puerto Rico (Atlantic)', color: '#c0567f', grey: '#8e8e8e' },
];
const byKey = Object.fromEntries(ZONES.map((z) => [z.key, z]));

// The northeast is too crowded for centroid labels; these get a leader line
// out to a column on the right.
const LEADER = {
  VT: 96, NH: 118, MA: 140, RI: 162, CT: 184, NJ: 208, DE: 230, MD: 252, DC: 274,
};
const LEADER_X = 944;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {{ mode: 'color'|'grey'|'blank', title: string, subtitle: string }} opts
 */
function buildSvg({ mode, title, subtitle }) {
  const W = 1100;
  const H = 860;
  const mapY = 92;
  const legendY = mapY + MH + 34;

  const fillFor = (s) => {
    if (mode === 'blank') return '#ffffff';
    const z = byKey[s.mapZone];
    if (!z) throw new Error(`printable map has no colour for zone "${s.mapZone}"`);
    return mode === 'color' ? z.color : z.grey;
  };
  // Grey prints need a darker outline to separate neighbouring shades.
  const strokeFor = () => (mode === 'color' ? '#ffffff' : '#333333');
  const strokeW = mode === 'color' ? 1 : 0.8;

  // A state a zone boundary crosses is filled once in the zone holding most of
  // its counties, then the remaining zones go over it as shapes merged from
  // their own counties, so the printed boundary follows real county lines.
  // None of them is stroked: a zone change should read as a change of colour,
  // not as a line drawn through the middle of the state. Fill sits on a
  // wrapper rather than the path so that the <use> below can override it.
  const paths = shapes
    .flatMap((s) =>
      s.parts
        ? [
            `<g fill="${fillFor({ ...s, mapZone: s.parts[0].zone })}"><path id="s${s.fips}" d="${s.d}"/></g>`,
            ...s.parts
              .slice(1)
              .map(
                (part) =>
                  `<path d="${part.d}" fill="${fillFor({ ...s, mapZone: part.zone })}" stroke="none"/>`,
              ),
          ]
        : [
            `<path d="${s.d}" fill="${fillFor(s)}" stroke="${strokeFor()}" stroke-width="${strokeW}" stroke-linejoin="round"/>`,
          ],
    )
    .join('\n      ');

  // Which leaves those states with no border of their own, so draw it here over
  // the fills, re-using the path each was filled with rather than repeating its
  // geometry.
  const outlines = shapes
    .filter((s) => s.parts)
    .map(
      (s) =>
        `<use href="#s${s.fips}" xlink:href="#s${s.fips}" fill="none" stroke="${strokeFor()}" stroke-width="${strokeW}" stroke-linejoin="round"/>`,
    )
    .join('\n      ');

  // Labels: centroid where there is room, leader line for the crowded northeast.
  const labels = shapes
    .filter((s) => s.usps && s.cx !== undefined)
    .map((s) => {
      const dark = mode === 'color' || mode === 'grey';
      const fill = mode === 'blank' ? '#444444' : dark && mode === 'grey' ? '#111111' : '#11182a';
      if (LEADER[s.usps] !== undefined) {
        const ly = LEADER[s.usps];
        return (
          `<g>` +
          `<line x1="${s.cx}" y1="${s.cy}" x2="${LEADER_X - 5}" y2="${ly - 4}" stroke="#555555" stroke-width="0.7"/>` +
          `<text x="${LEADER_X}" y="${ly}" font-size="12" font-weight="700" fill="${fill}" text-anchor="start">${s.usps}</text>` +
          `</g>`
        );
      }
      return `<text x="${s.cx}" y="${s.cy}" font-size="12.5" font-weight="700" fill="${fill}" text-anchor="middle" dominant-baseline="middle" opacity="0.85">${s.usps}</text>`;
    })
    .join('\n      ');

  const legend =
    mode === 'blank'
      ? ''
      : ZONES.map((z, i) => {
          const x = 60 + (i % 4) * 250;
          const y = legendY + Math.floor(i / 4) * 30;
          const fill = mode === 'color' ? z.color : z.grey;
          return (
            `<g><rect x="${x}" y="${y - 12}" width="26" height="16" rx="3" fill="${fill}" stroke="#333333" stroke-width="0.7"/>` +
            `<text x="${x + 34}" y="${y}" font-size="14" fill="#222222">${esc(z.label)}</text></g>`
          );
        }).join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     font-family="Helvetica, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${W / 2}" y="48" font-size="27" font-weight="700" fill="#11182a" text-anchor="middle">${esc(title)}</text>
  <text x="${W / 2}" y="72" font-size="14" fill="#5a6478" text-anchor="middle">${esc(subtitle)}</text>
  <g transform="translate(${(W - MW) / 2}, ${mapY})">
      ${paths}
      ${outlines}
      ${labels}
  </g>
  ${legend ? `<g>\n      ${legend}\n  </g>` : ''}
  <text x="${W / 2}" y="${H - 20}" font-size="11" fill="#8a93a5" text-anchor="middle">Zone boundaries follow county lines; the states they cross are shown in both zones.</text>
</svg>
`;
}

const VARIANTS = [
  {
    file: 'us-time-zones-color',
    mode: 'color',
    title: 'US Time Zones',
    subtitle: 'Pacific, Mountain, Central and Eastern, with state abbreviations',
  },
  {
    file: 'us-time-zones-grayscale',
    mode: 'grey',
    title: 'US Time Zones',
    subtitle: 'Greyscale edition for black-and-white printing',
  },
  {
    file: 'us-blank-map',
    mode: 'blank',
    title: 'Blank US Map',
    subtitle: 'State borders and abbreviations only — for quizzes and worksheets',
  },
];

for (const v of VARIANTS) {
  const svg = buildSvg(v);
  const target = path.join(OUT, `${v.file}.svg`);
  fs.writeFileSync(target, svg);
  console.log(`${v.file}.svg  ${(fs.statSync(target).size / 1024).toFixed(1)} KB`);
}
console.log(`\n${VARIANTS.length} printable maps written to public/printables/`);
