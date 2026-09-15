// Where to put a country's name on the map.
//
// A centroid is the wrong anchor for this: it falls in the sea for Indonesia,
// in Argentina for Chile, and outside the mainland for anything crescent
// shaped. What a label wants is the pole of inaccessibility — the point
// furthest from any edge — which is also, usefully, the centre of the largest
// circle that fits inside the country. That radius doubles as a measure of how
// much room the label has, so the caller can decide whether the full name fits,
// only the country code fits, or nothing does.
//
// Implementation is the usual quadtree refinement (Mapbox's polylabel): start
// with a grid of square cells, keep splitting whichever cell could still hold a
// better answer than the best found so far, and stop once no cell can beat it
// by more than `precision`.

/** Parse an SVG path of the "M x,y L x,y … Z" form into rings of points. */
export function parseRings(d) {
  const rings = [];
  for (const part of d.split('M').slice(1)) {
    const ring = [];
    for (const m of part.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) {
      ring.push([Number(m[1]), Number(m[2])]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return a / 2;
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegmentSq(px, py, ax, ay, bx, by) {
  let x = ax;
  let y = ay;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = bx;
      y = by;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  return (px - x) ** 2 + (py - y) ** 2;
}

/** Distance from a point to the polygon's edge, negative outside it. */
function signedDist(x, y, rings) {
  let inside = false;
  let minSq = Infinity;
  for (const ring of rings) {
    if (pointInRing(x, y, ring)) inside = !inside;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      minSq = Math.min(minSq, distToSegmentSq(x, y, ring[j][0], ring[j][1], ring[i][0], ring[i][1]));
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minSq);
}

function cell(x, y, h, rings) {
  const d = signedDist(x, y, rings);
  // The best a cell could possibly do is its centre distance plus its own
  // half-diagonal, which is what makes the search admissible.
  return { x, y, h, d, max: d + h * Math.SQRT2 };
}

/**
 * Pole of inaccessibility of `rings` (first ring outer, rest holes).
 * Returns { x, y, r } where r is the radius of the largest inscribed circle.
 */
export function polylabel(rings, precision = 0.4) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of rings[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.min(w, h);
  if (size === 0) return { x: minX, y: minY, r: 0 };

  const queue = [];
  let cellSize = size / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      queue.push(cell(x + cellSize / 2, y + cellSize / 2, cellSize / 2, rings));
    }
  }

  // Centroid of the bounding box is a reasonable starting guess.
  let best = cell(minX + w / 2, minY + h / 2, 0, rings);

  let guard = 0;
  while (queue.length && guard++ < 200_000) {
    // Take whichever cell has the most headroom left.
    let bestIdx = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].max > queue[bestIdx].max) bestIdx = i;
    const c = queue.splice(bestIdx, 1)[0];

    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;

    const half = c.h / 2;
    queue.push(
      cell(c.x - half, c.y - half, half, rings),
      cell(c.x + half, c.y - half, half, rings),
      cell(c.x - half, c.y + half, half, rings),
      cell(c.x + half, c.y + half, half, rings),
    );
  }
  return { x: best.x, y: best.y, r: Math.max(0, best.d) };
}

/**
 * Label anchor for one country's path: the pole of inaccessibility of its
 * largest landmass, with any rings enclosed by that landmass treated as holes
 * so a label never lands in, say, Lesotho while claiming to be South Africa.
 * Outlying islands are ignored on purpose — a label belongs on the mainland.
 */
export function labelAnchor(d) {
  const rings = parseRings(d);
  if (!rings.length) return null;

  let main = rings[0];
  let mainArea = Math.abs(ringArea(rings[0]));
  for (const ring of rings) {
    const a = Math.abs(ringArea(ring));
    if (a > mainArea) {
      main = ring;
      mainArea = a;
    }
  }

  const holes = rings.filter(
    (r) => r !== main && Math.abs(ringArea(r)) < mainArea && pointInRing(r[0][0], r[0][1], main),
  );

  return polylabel([main, ...holes]);
}

// ---------------------------------------------------------------------------
// Choosing which labels actually get drawn.

const NAME_FS = 7;
const CODE_FS = 6;

// Rough advance widths, in ems, for the sans the map renders in.
//
// SAFETY is why this is usable at all. Measuring all 78 labels in the browser
// with getComputedTextLength showed the raw sum running up to 11% under the
// real width (worst case "Chad"), which was enough to let Argentina's label
// collide with Uruguay's. Over-estimating only costs a label that would have
// just squeezed in; under-estimating puts two labels on top of each other, so
// the margin deliberately errs wide.
const SAFETY = 1.15;

function textWidth(s, fs) {
  let em = 0;
  for (const ch of s) {
    if (ch === ' ') em += 0.28;
    else if ('iljt.,'.includes(ch)) em += 0.30;
    else if ('fr'.includes(ch)) em += 0.38;
    else if ('MW'.includes(ch)) em += 0.86;
    else if (ch >= 'A' && ch <= 'Z') em += 0.70;
    else em += 0.53;
  }
  return em * fs * SAFETY;
}

const overlaps = (a, b) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;

/**
 * Decide, per country, whether its full name fits in the room it has, whether
 * only its code does, or neither.
 *
 * Countries are considered widest-room first, so where two labels would collide
 * the more prominent country keeps its label. Everything is resolved here, at
 * build time, so the map ships as finished markup.
 */
export function assignLabels(shapes) {
  const placed = [];
  const order = [...shapes].sort((a, b) => b.r - a.r);

  for (const s of order) {
    s.label = null;
    if (!s.r) continue;

    for (const [kind, text, fs] of [
      ['name', s.name, NAME_FS],
      ['code', s.code, CODE_FS],
    ]) {
      const w = textWidth(text, fs);
      // The inscribed circle is the room available: the label's half-diagonal
      // has to sit inside it, with a little air.
      if (Math.hypot(w / 2, fs / 2) > s.r * 1.25) continue;

      const box = { x: s.cx, y: s.cy, w: w + 2, h: fs + 1.5 };
      if (placed.some((p) => overlaps(box, p))) continue;

      s.label = kind;
      s.labelW = Math.round(w * 10) / 10;
      placed.push(box);
      break;
    }
  }
  return shapes;
}
