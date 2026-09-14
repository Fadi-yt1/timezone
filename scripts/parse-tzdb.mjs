// Parses the system IANA tzdb tables into structured JSON.
import fs from 'node:fs';

const TZDIR = '/usr/share/zoneinfo';

/** "+4042-07400" / "+404251-0740023" -> { lat, lon } in decimal degrees */
function parseCoords(s) {
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/.exec(s);
  if (!m) return null;
  const dms = (sign, d, mi, se) =>
    (sign === '-' ? -1 : 1) * (Number(d) + Number(mi) / 60 + Number(se || 0) / 3600);
  return {
    lat: Number(dms(m[1], m[2], m[3], m[4]).toFixed(4)),
    lon: Number(dms(m[5], m[6], m[7], m[8]).toFixed(4)),
  };
}

export function readCountries() {
  const out = {};
  for (const line of fs.readFileSync(`${TZDIR}/iso3166.tab`, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [code, name] = line.split('\t');
    if (code && name) out[code.trim()] = name.trim();
  }
  return out;
}

export function readZoneTab() {
  const rows = [];
  for (const line of fs.readFileSync(`${TZDIR}/zone1970.tab`, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [codes, coords, zone, comment] = line.split('\t');
    if (!zone) continue;
    rows.push({
      zone: zone.trim(),
      countries: codes.trim().split(','),
      coords: parseCoords(coords.trim()),
      comment: (comment || '').trim() || null,
    });
  }
  return rows;
}

/** Every zone name shipped in the tzdb, including links (UTC, US/Eastern, Etc/GMT+5). */
export function readAllZoneNames() {
  const out = [];
  const skipTop = new Set(['posix', 'right', 'posixrules', 'Factory', 'localtime']);
  const walk = (dir, prefix) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (prefix === '' && skipTop.has(e.name)) continue;
      const name = prefix ? `${prefix}/${e.name}` : e.name;
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(full, name); continue; }
      if (/\.(tab|zi|list)$|^leap|^tzdata|^leapseconds$/.test(e.name)) continue;
      // Zone files are TZif binaries; anything else in the tree is metadata.
      const fd = fs.openSync(full, 'r');
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      if (buf.toString('ascii') === 'TZif') out.push(name);
    }
  };
  walk(TZDIR, '');
  return out.sort();
}
