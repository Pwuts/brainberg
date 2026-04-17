/** European country codes (ISO 3166-1 alpha-2) matching our countries table. */
export const EUROPEAN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE", "GB", "CH", "NO", "IS", "UA", "RS",
  "TR", "AL", "BA", "ME", "MK", "MD", "GE",
]);

/** Map full country names (lowercase) to ISO codes. */
const NAME_TO_CODE: Record<string, string> = {
  austria: "AT", belgium: "BE", bulgaria: "BG", croatia: "HR",
  cyprus: "CY", czechia: "CZ", "czech republic": "CZ",
  denmark: "DK", estonia: "EE", finland: "FI", france: "FR",
  germany: "DE", greece: "GR", hungary: "HU", ireland: "IE",
  italy: "IT", latvia: "LV", lithuania: "LT", luxembourg: "LU",
  malta: "MT", netherlands: "NL", "the netherlands": "NL",
  poland: "PL", portugal: "PT", romania: "RO", slovakia: "SK",
  slovenia: "SI", spain: "ES", sweden: "SE",
  "united kingdom": "GB", "great britain": "GB", uk: "GB",
  switzerland: "CH", norway: "NO", iceland: "IS", ukraine: "UA",
  serbia: "RS", turkey: "TR", türkiye: "TR", albania: "AL",
  "bosnia and herzegovina": "BA", montenegro: "ME",
  "north macedonia": "MK", moldova: "MD", georgia: "GE",
};

/** Normalize a country name or code to an ISO code, or return undefined. */
export function toCountryCode(input: string): string | undefined {
  const upper = input.toUpperCase();
  if (EUROPEAN_COUNTRIES.has(upper)) return upper;
  return NAME_TO_CODE[input.toLowerCase()];
}

export function isEuropean(country: string | undefined | null): boolean {
  if (!country) return false;
  return toCountryCode(country) !== undefined;
}
