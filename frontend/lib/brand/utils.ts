/**
 * Muse Brand Utilities
 * Helper functions for enforcing brand guidelines
 */

import { BrandTokens } from './tokens';

/**
 * Get color from brand tokens with TypeScript safety
 */
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = BrandTokens.colors;

  for (const key of keys) {
    value = value?.[key];
  }

  if (typeof value !== 'string') {
    console.warn(`Brand color not found: ${path}`);
    return BrandTokens.colors.text.primary;
  }

  return value;
};

/**
 * Get spacing value from brand tokens
 */
export const getSpacing = (size: keyof typeof BrandTokens.spacing): string => {
  return BrandTokens.spacing[size];
};

/**
 * Validate gradient usage - enforces HARD RULE
 * Only one gradient per screen, only for primary CTA
 */
let gradientUsedOnScreen = false;

export const canUseGradient = (componentName: string, isPrimaryCTA: boolean): boolean => {
  if (!isPrimaryCTA) {
    console.error(
      `[Brand Violation] Gradient used on ${componentName} but it's not a primary CTA. ` +
      `Gradients are ONLY allowed on primary CTAs.`
    );
    return false;
  }

  if (gradientUsedOnScreen) {
    console.error(
      `[Brand Violation] Multiple gradients detected. ` +
      `Only ONE gradient allowed per screen (primary CTA only).`
    );
    return false;
  }

  gradientUsedOnScreen = true;
  return true;
};

export const resetGradientTracking = () => {
  gradientUsedOnScreen = false;
};

/**
 * Generate button classes following brand guidelines
 */
export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'tertiary',
  isPrimaryCTA: boolean = false
): string => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium
    transition-all duration-200
    rounded-[12px]
    active:scale-[0.98]
  `.trim().replace(/\s+/g, ' ');

  const variants = {
    primary: isPrimaryCTA && canUseGradient('Button', true)
      ? `bg-gradient-to-r from-[#F4C4B0] via-[#F1785A] to-[#A8C5E0] text-white shadow-sm hover:shadow-base`
      : `bg-[#333333] text-white shadow-sm hover:bg-[#4A4A4A]`,

    secondary: `bg-white text-[#333333] shadow-sm hover:bg-[#F5F5F5] border border-gray-200`,

    tertiary: `bg-transparent text-[#333333] hover:bg-[rgba(0,0,0,0.05)]`,
  };

  return `${baseClasses} ${variants[variant]}`;
};

/**
 * Generate text classes following typography guidelines
 */
export const getTextClasses = (
  variant: 'headline' | 'subhead' | 'body' | 'caption' | 'small'
): string => {
  const variants = {
    headline: 'text-[32px] font-medium leading-tight tracking-tight',
    subhead: 'text-[20px] font-medium leading-normal',
    body: 'text-[16px] font-normal leading-relaxed',
    caption: 'text-[14px] font-normal leading-normal text-[#6B6B6B]',
    small: 'text-[13px] font-normal leading-normal text-[#9A9A9A]',
  };

  return variants[variant];
};

/**
 * Validate color usage distribution
 * Enforces 90% neutral, 10% accent rule
 */
export const validateColorDistribution = (
  neutralCount: number,
  accentCount: number
): boolean => {
  const total = neutralCount + accentCount;
  const neutralPercentage = (neutralCount / total) * 100;

  if (neutralPercentage < 85) {
    console.warn(
      `[Brand Warning] Neutral colors should be 85-90% of usage. ` +
      `Current: ${neutralPercentage.toFixed(1)}%`
    );
    return false;
  }

  return true;
};

/**
 * Generate layout container classes
 */
export const getContainerClasses = (maxWidth: 'content' | 'form' = 'content'): string => {
  const widths = {
    content: 'max-w-[672px]',
    form: 'max-w-[448px]',
  };

  return `w-full ${widths[maxWidth]} mx-auto px-6`;
};

/**
 * Check if border radius is compliant
 */
export const validateBorderRadius = (radius: string): boolean => {
  if (radius !== '12px' && radius !== BrandTokens.borderRadius.default) {
    console.error(
      `[Brand Violation] Border radius must be 12px everywhere. ` +
      `Found: ${radius}`
    );
    return false;
  }
  return true;
};

/**
 * Forbidden components checker
 */
const FORBIDDEN_COMPONENTS = ['chip', 'tag', 'badge', 'pill'];

export const validateComponent = (componentName: string): boolean => {
  const lowerName = componentName.toLowerCase();

  for (const forbidden of FORBIDDEN_COMPONENTS) {
    if (lowerName.includes(forbidden)) {
      console.error(
        `[Brand Violation] Component "${componentName}" is forbidden. ` +
        `Forbidden components: ${FORBIDDEN_COMPONENTS.join(', ')}`
      );
      return false;
    }
  }

  return true;
};

/**
 * Get brand-compliant CSS custom properties
 */
export const getBrandCSSVariables = (): Record<string, string> => {
  return {
    // Colors
    '--color-background': BrandTokens.colors.background.primary,
    '--color-background-secondary': BrandTokens.colors.background.secondary,
    '--color-text-primary': BrandTokens.colors.text.primary,
    '--color-text-secondary': BrandTokens.colors.text.secondary,
    '--color-text-tertiary': BrandTokens.colors.text.tertiary,
    '--color-accent-peach': BrandTokens.colors.accents.peach,
    '--color-accent-coral': BrandTokens.colors.accents.coral,
    '--color-accent-blue': BrandTokens.colors.accents.coolBlue,

    // Typography
    '--font-family': BrandTokens.typography.fontFamily.primary,
    '--font-size-body': BrandTokens.typography.fontSize.body,

    // Spacing
    '--border-radius': BrandTokens.borderRadius.default,

    // Animation
    '--transition-duration': BrandTokens.animation.duration.normal,
    '--transition-easing': BrandTokens.animation.easing.default,
  };
};
