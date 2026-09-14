export interface Zone {
  /** Canonical IANA name, preferring modern spellings (Asia/Kolkata, Europe/Kyiv). */
  zone: string;
  /** The id ICU stores this zone under; may be a legacy alias. */
  icuKey: string;
  /** Display label, e.g. "New York". */
  label: string;
  region: string;
  /** True for the geographic zones users browse (from zone1970.tab). */
  listed: boolean;
  /** True for UTC and the fixed Etc/GMT±N zones. */
  utcLike: boolean;
  aliases: string[];
  /** Every country in this zone's tzdb row: its own first, then rule-sharers. */
  countries: string[];
  /** The country the zone actually sits in. */
  primaryCountry: string | null;
  /** Countries whose clocks have matched this zone since 1970 but that don't host it. */
  sharedCountries: string[];
  lat: number | null;
  lon: number | null;
  /** tzdb's own disambiguating note, e.g. "Eastern (most areas)". */
  note: string | null;
  usesDst: boolean;
  stdOffset: number;
  dstOffset: number | null;
  stdAbbr: string | null;
  dstAbbr: string | null;
  longName: string | null;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  zones: string[];
  /** True when the country hosts no zone of its own and borrows another's. */
  sharesZone?: boolean;
}

export interface City {
  name: string;
  country: string | null;
  countryName: string | null;
  zone: string;
  lat: number;
  lon: number;
  population: number | null;
  /** True when the city is the zone's own namesake. */
  primary: boolean;
}
