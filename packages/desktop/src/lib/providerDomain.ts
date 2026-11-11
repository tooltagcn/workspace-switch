/**
 * Compact identity label for a provider: the host of its base URL
 * (e.g. "api.moonshot.cn"). Falls back to the raw string when it is not a
 * parseable URL; null when no base URL is set.
 */
export function providerDomain(baseUrl: string | null | undefined): string | null {
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).host || null;
  } catch {
    return baseUrl;
  }
}
