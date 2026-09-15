// Checks the country labels the map build placed on the world map.
//
// The packing is decided at build time from geometry alone, so it can be
// checked the same way — no browser needed. Three things have to hold for the
// map to stay readable:
//
//   1. every label sits inside the country it names,
//   2. no two labels overlap,
//   3. no label is wider than the room its country actually has.
//
// The width estimate these rest on was calibrated against getComputedTextLength
// in a real browser and carries a margin (see SAFETY in label-anchors.mjs); this
// check works in the same units, so it catches a packing regression but not the
// font itself changing.
import fs from 'node:fs';
import path from 'node:path';
import { parseRings } from './label-anchors.mjs';

const world = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/data/world.json'), 'utf8'),
);

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const labelled = world.shapes.filter((s) => s.label);
const failures = [];

// 1. Anchors land on land — and specifically on the country being named.
for (const s of world.shapes) {
  const rings = parseRings(s.d);
  let inside = false;
  for (const ring of rings) if (pointInRing(s.cx, s.cy, ring)) inside = !inside;
  if (!inside) failures.push(`${s.name}: label anchor falls outside the country`);
}

// 2. No two labels collide.
const boxes = labelled.map((s) => ({
  name: s.label === 'name' ? s.name : s.code,
  x: s.cx,
  y: s.cy,
  w: s.labelW + 2,
  h: (s.label === 'name' ? 7 : 6) + 1.5,
}));
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i];
    const b = boxes[j];
    if (Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h) {
      failures.push(`${a.name} overlaps ${b.name}`);
    }
  }
}

// 3. Nothing is claiming more room than it has.
for (const s of labelled) {
  const fs_ = s.label === 'name' ? 7 : 6;
  if (Math.hypot(s.labelW / 2, fs_ / 2) > s.r * 1.25 + 0.01) {
    failures.push(`${s.name}: label is wider than the room at its anchor`);
  }
}

// A map with no names on it would pass all three, so check it did something.
const named = labelled.filter((s) => s.label === 'name').length;
if (named < 15) failures.push(`only ${named} countries carry a full name — expected at least 15`);

for (const f of failures) console.error('  FAIL', f);
console.log(
  failures.length
    ? `\n${failures.length} label check(s) failed`
    : `${named} names + ${labelled.length - named} codes placed, none overlapping`,
);
process.exit(failures.length ? 1 : 0);
