import { subsolarPoint, type Instant } from './time';

/**
 * SVG path for the night hemisphere in an equirectangular projection.
 *
 * At every longitude the terminator sits where the sun grazes the horizon:
 *   tan(lat) = -cos(lon - subsolarLon) / tan(subsolarLat)
 * The polygon closes along whichever pole is in darkness.
 */
export function nightPath(width: number, height: number, at: Instant = Date.now()): string {
  const { lat: sunLat, lon: sunLon } = subsolarPoint(at);
  const RAD = Math.PI / 180;
  const xFor = (lon: number) => ((lon + 180) / 360) * width;
  const yFor = (lat: number) => ((90 - lat) / 180) * height;

  // Near an equinox tan(sunLat) approaches zero and the curve degenerates to
  // a meridian; clamping keeps the polygon well formed.
  const tanSun = Math.tan(Math.max(Math.abs(sunLat), 0.6) * RAD) * Math.sign(sunLat || 1);

  const points: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 1.5) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * RAD) / tanSun) / RAD;
    points.push([xFor(lon), yFor(Math.max(-90, Math.min(90, lat)))]);
  }

  // The pole on the sun's side is lit, so night closes along the opposite pole.
  const poleY = sunLat >= 0 ? height : 0;
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return `${d}L${width},${poleY}L0,${poleY}Z`;
}
