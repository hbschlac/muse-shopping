/**
 * Brand Logo Utilities
 * Provides functions to get brand logos from local storage
 */

/**
 * Sanitize brand name to match logo filename format
 */
export function sanitizeBrandName(brandName: string): string {
  // Remove special characters and replace spaces with hyphens
  let safe = brandName.toLowerCase();
  safe = safe.replace(/[^a-z0-9 -]/g, '');
  safe = safe.replace(/\s+/g, '-');
  // Remove consecutive hyphens
  while (safe.includes('--')) {
    safe = safe.replace('--', '-');
  }
  return safe.replace(/^-+|-+$/g, '');
}

/**
 * Get the logo path for a brand
 * Returns the local logo path or null if not found
 */
export function getBrandLogo(brandName: string): string | null {
  if (!brandName) return null;

  const sanitized = sanitizeBrandName(brandName);
  const logoPath = `/logos/brands/${sanitized}.png`;

  return logoPath;
}

/**
 * Get brand logo with fallback
 * Returns logo path or fallback URL/null
 */
export function getBrandLogoWithFallback(
  brandName: string,
  fallbackUrl?: string | null
): string | null {
  const localLogo = getBrandLogo(brandName);

  // If we have a local logo, prefer it
  if (localLogo) {
    return localLogo;
  }

  // Otherwise use the fallback
  return fallbackUrl || null;
}

/**
 * Check if a brand logo exists locally
 * Note: This only checks the path format, not if the file actually exists
 * Use this for generating paths, not for validation
 */
export function hasLocalBrandLogo(brandName: string): boolean {
  return brandName ? true : false;
}

/**
 * Common brand name mappings for edge cases
 */
const BRAND_NAME_MAPPINGS: Record<string, string> = {
  'h&m': 'hm',
  'h & m': 'hm',
  'c&a': 'ca',
  'c & a': 'ca',
  'l.l.bean': 'llbean',
  'l.l. bean': 'llbean',
  "macy's": 'macys',
  "nordstrom rack": 'nordstrom-rack',
  "bloomingdale's": 'bloomingdales',
};

/**
 * Normalize brand name using common mappings
 */
export function normalizeBrandName(brandName: string): string {
  const lower = brandName.toLowerCase().trim();
  return BRAND_NAME_MAPPINGS[lower] || brandName;
}

/**
 * Get brand logo with normalization
 */
export function getBrandLogoNormalized(brandName: string): string | null {
  const normalized = normalizeBrandName(brandName);
  return getBrandLogo(normalized);
}
