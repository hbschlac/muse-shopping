/**
 * Muse Logo Utilities
 * Provides functions to get the appropriate Muse logo variant based on context
 */

export type LogoVariant = 'wordmark' | 'lettermark';
export type LogoStyle = 'gradient' | 'white' | 'grey' | 'solid';

export interface LogoOptions {
  variant?: LogoVariant;
  style?: LogoStyle;
  /** Background color context - 'dark' will use white logo, 'light' will use gradient/grey */
  background?: 'light' | 'dark';
}

/**
 * Get the appropriate Muse logo path based on options
 *
 * @example
 * // Get gradient wordmark (default)
 * getMuseLogo() // '/muse-wordmark-gradient.svg'
 *
 * @example
 * // Get white logo for dark backgrounds
 * getMuseLogo({ background: 'dark' }) // '/muse-wordmark-white.svg'
 *
 * @example
 * // Get white lettermark
 * getMuseLogo({ variant: 'lettermark', style: 'white' }) // '/muse-lettermark-white.svg'
 */
export function getMuseLogo(options: LogoOptions = {}): string {
  const {
    variant = 'wordmark',
    style,
    background = 'light'
  } = options;

  // Auto-select style based on background if not specified
  let logoStyle = style;
  if (!logoStyle) {
    logoStyle = background === 'dark' ? 'white' : 'gradient';
  }

  // Build the logo path
  const baseName = variant === 'lettermark' ? 'muse-lettermark' : 'muse-wordmark';

  if (logoStyle === 'gradient' && variant === 'wordmark') {
    return '/muse-wordmark-gradient.svg';
  }

  if (logoStyle === 'solid' && variant === 'wordmark') {
    return '/muse-wordmark.svg';
  }

  if (logoStyle === 'grey' && variant === 'wordmark') {
    return '/muse-wordmark-grey.svg';
  }

  if (logoStyle === 'white') {
    return `/${baseName}-white.svg`;
  }

  // Default fallback to gradient wordmark
  return '/muse-wordmark-gradient.svg';
}

/**
 * Get logo for light backgrounds (gradient or grey)
 */
export function getMuseLogoForLight(variant: LogoVariant = 'wordmark'): string {
  return getMuseLogo({ variant, background: 'light' });
}

/**
 * Get logo for dark backgrounds (white)
 */
export function getMuseLogoForDark(variant: LogoVariant = 'wordmark'): string {
  return getMuseLogo({ variant, background: 'dark' });
}

/**
 * Get gradient logo (brand primary)
 */
export function getMuseLogoGradient(variant: LogoVariant = 'wordmark'): string {
  return getMuseLogo({ variant, style: 'gradient' });
}

/**
 * Get white logo (for dark backgrounds, overlays, etc.)
 */
export function getMuseLogoWhite(variant: LogoVariant = 'wordmark'): string {
  return getMuseLogo({ variant, style: 'white' });
}

/**
 * Available logo paths for direct access
 */
export const MUSE_LOGOS = {
  wordmark: {
    gradient: '/muse-wordmark-gradient.svg',
    white: '/muse-wordmark-white.svg',
    grey: '/muse-wordmark-grey.svg',
    solid: '/muse-wordmark.svg',
  },
  lettermark: {
    white: '/muse-lettermark-white.svg',
  },
  // Legacy paths
  legacy: {
    handwritten: '/logo-muse-handwritten.svg',
    standard: '/logo-muse.svg',
  }
} as const;
