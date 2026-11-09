/**
 * DUKES partner labels → Natural Earth ADM0_A3 (ISO-like) for world choropleth.
 * Unmatched partners (aggregates, unspecified, facilities without a country shape)
 * stay RankBars-only — never invent a country fill.
 */

/** Exact DUKES / IEA-style labels seen in oil-imports-by-country + gas-trade-by-partner. */
const PARTNER_LABEL_TO_ISO: Record<string, string> = {
  Algeria: "DZA",
  Angola: "AGO",
  Argentina: "ARG",
  Australia: "AUS",
  Austria: "AUT",
  Azerbaijan: "AZE",
  Bahamas: "BHS",
  Bahrain: "BHR",
  Belarus: "BLR",
  Belgium: "BEL",
  "Bosnia and Herzegovina": "BIH",
  Brazil: "BRA",
  Bulgaria: "BGR",
  Cameroon: "CMR",
  Canada: "CAN",
  Chile: "CHL",
  "China, People's Republic": "CHN",
  "China, People's Republic of": "CHN",
  Colombia: "COL",
  Congo: "COG",
  Croatia: "HRV",
  Cyprus: "CYP",
  "Czech Republic": "CZE",
  Denmark: "DNK",
  "Dominican Republic": "DOM",
  Ecuador: "ECU",
  Egypt: "EGY",
  "Equatorial Guinea": "GNQ",
  Estonia: "EST",
  Finland: "FIN",
  France: "FRA",
  Gabon: "GAB",
  Georgia: "GEO",
  Germany: "DEU",
  Greece: "GRC",
  Hungary: "HUN",
  Iceland: "ISL",
  India: "IND",
  Indonesia: "IDN",
  "Iran, Islamic Republic": "IRN",
  Iraq: "IRQ",
  Ireland: "IRL",
  "Republic of Ireland": "IRL",
  Israel: "ISR",
  Italy: "ITA",
  Japan: "JPN",
  Kazakhstan: "KAZ",
  Korea: "KOR",
  Kuwait: "KWT",
  Latvia: "LVA",
  Liberia: "LBR",
  Libya: "LBY",
  Lithuania: "LTU",
  Luxembourg: "LUX",
  Malaysia: "MYS",
  Malta: "MLT",
  Mexico: "MEX",
  Morocco: "MAR",
  Netherlands: "NLD",
  "New Zealand": "NZL",
  Nigeria: "NGA",
  Norway: "NOR",
  Oman: "OMN",
  "Papua New Guinea": "PNG",
  Peru: "PER",
  Poland: "POL",
  Portugal: "PRT",
  Qatar: "QAT",
  Romania: "ROU",
  Russia: "RUS",
  "Russian Federation": "RUS",
  "Saudi Arabia": "SAU",
  Serbia: "SRB",
  Singapore: "SGP",
  "Slovak Republic": "SVK",
  Slovenia: "SVN",
  "South Africa": "ZAF",
  Spain: "ESP",
  Sweden: "SWE",
  Switzerland: "CHE",
  "Taiwan / Chinese Taipei": "TWN",
  Thailand: "THA",
  "Trinidad and Tobago": "TTO",
  Tunisia: "TUN",
  Turkey: "TUR",
  Turkmenistan: "TKM",
  Ukraine: "UKR",
  "United Arab Emirates": "ARE",
  "United Kingdom": "GBR",
  "United States": "USA",
  USA: "USA",
  Uzbekistan: "UZB",
  Venezuela: "VEN",
  "Venezuela, Bolivarian Republic": "VEN",
  Vietnam: "VNM",
  Yemen: "YEM",
};

/**
 * Aggregates / unspecified buckets, plus tiny territories absent from
 * Natural Earth 110m (stay RankBars-only).
 */
const OFF_MAP = new Set([
  "Total imports",
  "Total exports",
  "Total pipeline",
  "Total LNG",
  "Net imports",
  "Reloads",
  "Non-specified, other",
  "Not elsewhere specified",
  "Other Africa",
  "Other Asia Oceania",
  "Other Asia and Pacific",
  "Other Europe",
  "Other Near and Middle East",
  "Other Non-OECD Americas",
  "Other non-OECD Americas",
  "Netherlands Antilles",
  "Gibraltar",
  "Hong Kong (China)",
  "Hong Kong, China",
  "Isle of Man",
  "Curaçao",
]);

/**
 * Map a published partner country label to Natural Earth ADM0_A3.
 * Returns null for aggregates, unspecified buckets, and unknown labels.
 */
export function isoForPartnerLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || OFF_MAP.has(trimmed)) return null;
  return PARTNER_LABEL_TO_ISO[trimmed] ?? null;
}

/** Whether this partner can paint on the world choropleth. */
export function partnerHasMapGeometry(label: string): boolean {
  return isoForPartnerLabel(label) != null;
}
