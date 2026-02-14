/**
 * Muse Brand System
 * Central export for all brand utilities, tokens, and components
 *
 * Usage:
 * import { BrandTokens, getColor, BrandButton } from '@/lib/brand';
 */

import { BrandTokens as Tokens } from './tokens';

export { BrandTokens } from './tokens';
export type { BrandColors, BrandGradients, BrandTypography, BrandSpacing } from './tokens';

export {
  getColor,
  getSpacing,
  canUseGradient,
  resetGradientTracking,
  getButtonClasses,
  getTextClasses,
  validateColorDistribution,
  getContainerClasses,
  validateBorderRadius,
  validateComponent,
  getBrandCSSVariables,
} from './utils';

export { BrandButton } from './components/Button';
export type { BrandButtonProps } from './components/Button';

export {
  getMuseLogo,
  getMuseLogoForLight,
  getMuseLogoForDark,
  getMuseLogoGradient,
  getMuseLogoWhite,
  MUSE_LOGOS,
} from './logos';
export type { LogoVariant, LogoStyle, LogoOptions } from './logos';

// Re-export for convenience
export const Brand = {
  tokens: Tokens,
  colors: Tokens.colors,
  typography: Tokens.typography,
  spacing: Tokens.spacing,
  borderRadius: Tokens.borderRadius,
  gradients: Tokens.gradients,
} as const;
