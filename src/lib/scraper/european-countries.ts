/** European country codes (ISO 3166-1 alpha-2) matching our countries table. */
export const EUROPEAN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE", "GB", "CH", "NO", "IS", "UA", "RS",
  "TR", "AL", "BA", "ME", "MK", "MD", "GE",
]);

export function isEuropean(countryCode: string | undefined | null): boolean {
  if (!countryCode) return false;
  return EUROPEAN_COUNTRIES.has(countryCode.toUpperCase());
}
