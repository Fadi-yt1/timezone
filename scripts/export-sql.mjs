// Exports the site's reference data as a MySQL dump.
//
// The website itself does NOT need this. It is a static export: every timezone
// fact is already baked into the HTML and into src/data/*.json at build time,
// and nothing queries a database at runtime.
//
// This exists so the same IANA tzdb data can be queried from SQL — if you want
// to build PHP pages against it, join it to your own tables, or just browse it
// in phpMyAdmin. Import it and the site keeps working exactly as before,
// because the two are independent.
//
// Usage:  node scripts/export-sql.mjs > timezone-data.sql
import fs from 'node:fs';
import path from 'node:path';

const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data', `${name}.json`), 'utf8'));

const zones = read('zones');
const countries = read('countries');
const cities = read('cities');
const aliases = read('aliases');

/** MySQL string literal. Backslash and quote both need escaping. */
function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

/** Emit INSERTs in batches; one giant statement can exceed max_allowed_packet. */
function insert(table, columns, rows, batchSize = 200) {
  if (!rows.length) return '';
  const out = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    out.push(
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES\n` +
        chunk.map((r) => `  (${r.map(q).join(', ')})`).join(',\n') +
        ';',
    );
  }
  return out.join('\n');
}

const L = [];
L.push('-- Meridian — IANA time zone reference data.');
L.push('--');
L.push('-- Generated from the same dataset the website is built from.');
L.push('-- The site is static and does not read this database; it is here so the');
L.push('-- data can be queried directly.');
L.push(`-- Zones: ${zones.length}   Countries: ${countries.length}   ` +
  `Cities: ${cities.length}   Aliases: ${Object.keys(aliases).length}`);
L.push('--');
L.push('-- Time zone data is from the IANA time zone database, which is in the');
L.push('-- public domain.');
L.push('');
L.push('SET NAMES utf8mb4;');
L.push('SET FOREIGN_KEY_CHECKS = 0;');
L.push('');

// --- countries -------------------------------------------------------------
L.push('DROP TABLE IF EXISTS `cities`;');
L.push('DROP TABLE IF EXISTS `zone_countries`;');
L.push('DROP TABLE IF EXISTS `zone_aliases`;');
L.push('DROP TABLE IF EXISTS `time_zones`;');
L.push('DROP TABLE IF EXISTS `countries`;');
L.push('');

L.push(`CREATE TABLE \`countries\` (
  \`code\` CHAR(2) NOT NULL COMMENT 'ISO 3166-1 alpha-2',
  \`name\` VARCHAR(128) NOT NULL,
  \`flag\` VARCHAR(16) DEFAULT NULL COMMENT 'Emoji flag',
  \`shares_zone\` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Country shares a zone with another country',
  PRIMARY KEY (\`code\`),
  KEY \`idx_countries_name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
L.push('');
L.push(
  insert(
    'countries',
    ['code', 'name', 'flag', 'shares_zone'],
    countries.map((c) => [c.code, c.name, c.flag ?? null, !!c.sharesZone]),
  ),
);
L.push('');

// --- time_zones ------------------------------------------------------------
L.push(`CREATE TABLE \`time_zones\` (
  \`zone\` VARCHAR(64) NOT NULL COMMENT 'IANA name, e.g. Europe/Paris',
  \`icu_key\` VARCHAR(64) DEFAULT NULL COMMENT 'Canonical name ICU resolves to',
  \`label\` VARCHAR(96) DEFAULT NULL COMMENT 'Display name, e.g. Paris',
  \`region\` VARCHAR(32) DEFAULT NULL COMMENT 'Leading path segment',
  \`primary_country\` CHAR(2) DEFAULT NULL,
  \`listed\` TINYINT(1) NOT NULL DEFAULT 1
    COMMENT 'Shown in the site listings; 0 for UTC/Etc placeholders',
  \`utc_like\` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'UTC itself or an Etc/GMT* fixed offset',
  PRIMARY KEY (\`zone\`),
  KEY \`idx_zones_region\` (\`region\`),
  KEY \`idx_zones_country\` (\`primary_country\`),
  CONSTRAINT \`fk_zone_country\` FOREIGN KEY (\`primary_country\`)
    REFERENCES \`countries\` (\`code\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
L.push('');
L.push(
  insert(
    'time_zones',
    ['zone', 'icu_key', 'label', 'region', 'primary_country', 'listed', 'utc_like'],
    zones.map((z) => [
      z.zone,
      z.icuKey ?? null,
      z.label ?? null,
      z.region ?? null,
      z.primaryCountry ?? null,
      z.listed !== false,
      !!z.utcLike,
    ]),
  ),
);
L.push('');

// --- zone_countries --------------------------------------------------------
// A zone can cover several countries (Africa/Abidjan covers twelve), and a
// country can span several zones, so the relation needs its own table.
L.push(`CREATE TABLE \`zone_countries\` (
  \`zone\` VARCHAR(64) NOT NULL,
  \`country_code\` CHAR(2) NOT NULL,
  \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'The country this zone is named for',
  PRIMARY KEY (\`zone\`, \`country_code\`),
  KEY \`idx_zc_country\` (\`country_code\`),
  CONSTRAINT \`fk_zc_zone\` FOREIGN KEY (\`zone\`)
    REFERENCES \`time_zones\` (\`zone\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_zc_country\` FOREIGN KEY (\`country_code\`)
    REFERENCES \`countries\` (\`code\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
L.push('');
const known = new Set(countries.map((c) => c.code));
const zcRows = [];
for (const z of zones) {
  for (const code of z.countries ?? []) {
    // zone1970.tab lists a few codes with no tzdb country entry; the foreign
    // key would reject them.
    if (!known.has(code)) continue;
    zcRows.push([z.zone, code, code === z.primaryCountry]);
  }
}
L.push(insert('zone_countries', ['zone', 'country_code', 'is_primary'], zcRows));
L.push('');

// --- zone_aliases ----------------------------------------------------------
// Renamed zones keep their old names working: Asia/Calcutta -> Asia/Kolkata.
L.push(`CREATE TABLE \`zone_aliases\` (
  \`alias\` VARCHAR(64) NOT NULL COMMENT 'Name that may be encountered',
  \`zone\` VARCHAR(64) NOT NULL COMMENT 'Canonical name to resolve it to',
  PRIMARY KEY (\`alias\`),
  KEY \`idx_alias_zone\` (\`zone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
L.push('');
L.push(
  insert(
    'zone_aliases',
    ['alias', 'zone'],
    Object.entries(aliases).map(([alias, zone]) => [alias, zone]),
  ),
);
L.push('');

// --- cities ----------------------------------------------------------------
L.push(`CREATE TABLE \`cities\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(128) NOT NULL,
  \`country_code\` CHAR(2) DEFAULT NULL,
  \`country_name\` VARCHAR(128) DEFAULT NULL,
  \`zone\` VARCHAR(64) NOT NULL,
  \`lat\` DECIMAL(8,4) NOT NULL,
  \`lon\` DECIMAL(9,4) NOT NULL,
  \`population\` BIGINT UNSIGNED DEFAULT NULL,
  \`is_primary\` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Representative city for its zone',
  PRIMARY KEY (\`id\`),
  KEY \`idx_cities_name\` (\`name\`),
  KEY \`idx_cities_zone\` (\`zone\`),
  KEY \`idx_cities_country\` (\`country_code\`),
  CONSTRAINT \`fk_city_zone\` FOREIGN KEY (\`zone\`)
    REFERENCES \`time_zones\` (\`zone\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
L.push('');
L.push(
  insert(
    'cities',
    ['name', 'country_code', 'country_name', 'zone', 'lat', 'lon', 'population', 'is_primary'],
    cities.map((c) => [
      c.name,
      known.has(c.country) ? c.country : null,
      c.countryName ?? null,
      c.zone,
      c.lat,
      c.lon,
      c.population ?? null,
      !!c.primary,
    ]),
  ),
);
L.push('');
L.push('SET FOREIGN_KEY_CHECKS = 1;');
L.push('');

process.stdout.write(L.join('\n'));
