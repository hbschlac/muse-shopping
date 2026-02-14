/**
 * Muse Brand Design Tokens
 * Source of truth for all design decisions
 * Version: 1.0
 *
 * HARD RULES - DO NOT OVERRIDE:
 * - 90% neutral surfaces
 * - 1 primary accent only
 * - 1 gradient max per screen
 * - Gradient ONLY for primary CTA
 * - Border radius: 12px everywhere
 */

export const BrandTokens = {
  // ============================================================
  // COLORS
  // ============================================================
  colors: {
    // Background (85-90% usage)
    background: {
      primary: '#F0EAD8',      // Ecru - default app background
      secondary: '#FEFDFB',    // Ultra-light cream for cards/sections
      white: '#FFFFFF',        // Pure white for inputs/cards
    },

    // Foundation
    foundation: {
      slate: '#333333',        // Primary brand/text/logo color
    },

    // Text (neutral hierarchy)
    text: {
      primary: '#333333',      // Body text, headlines
      secondary: '#6B6B6B',    // Supporting text
      tertiary: '#9A9A9A',     // Captions, hints
    },

    // Accents (10% usage total)
    accents: {
      coolBlue: '#A8C5E0',     // Soft desaturated blue
      peach: '#F4C4B0',        // Soft peach
      coral: '#F1785A',        // Muted coral
    },

    // States
    states: {
      hover: 'rgba(0, 0, 0, 0.05)',
      disabled: '#E5E5E5',
      error: '#D32F2F',
      success: '#388E3C',
    },
  },

  // ============================================================
  // GRADIENTS (5% usage - PRIMARY CTA ONLY)
  // ============================================================
  gradients: {
    primaryCTA: 'linear-gradient(to right, #F4C4B0, #F1785A, #A8C5E0)',
    // NO OTHER GRADIENTS ALLOWED
  },

  // ============================================================
  // TYPOGRAPHY
  // ============================================================
  typography: {
    // Font Family
    fontFamily: {
      primary: '"Be Vietnam", "DM Sans", system-ui, -apple-system, sans-serif',
    },

    // Type Scale (max 6 styles)
    fontSize: {
      headline: '32px',        // 28-32px range
      subhead: '20px',         // 18-20px range
      body: '16px',            // ALWAYS 16px
      caption: '14px',
      small: '13px',
      tiny: '12px',
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
    },

    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },

    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  // ============================================================
  // SPACING
  // ============================================================
  spacing: {
    // Base unit: 4px
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '64px',

    // Specific use cases
    logoToTagline: '16px',     // 16-20px range
    taglineToButtons: '32px',  // 32-40px range
    buttonGap: '12px',         // 12-16px range
  },

  // ============================================================
  // SHAPE LANGUAGE
  // ============================================================
  borderRadius: {
    default: '12px',           // EVERYWHERE
    // No other radius values allowed
  },

  // ============================================================
  // SHADOWS
  // ============================================================
  shadows: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.06)',
    base: '0 2px 8px rgba(0, 0, 0, 0.08)',
    elevated: '0 4px 16px rgba(0, 0, 0, 0.10)',
  },

  // ============================================================
  // MOTION
  // ============================================================
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
    },
    easing: {
      default: 'ease-out',
      // NO spring or bounce animations
    },
  },

  // ============================================================
  // COMPONENT DIMENSIONS
  // ============================================================
  components: {
    button: {
      height: '56px',          // 14 = 3.5rem
      heightSmall: '40px',
      paddingX: '24px',
    },
    input: {
      height: '48px',
      paddingX: '16px',
    },
    maxWidth: {
      content: '672px',        // Max width container
      form: '448px',           // md
    },
  },
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================
export type BrandColors = typeof BrandTokens.colors;
export type BrandGradients = typeof BrandTokens.gradients;
export type BrandTypography = typeof BrandTokens.typography;
export type BrandSpacing = typeof BrandTokens.spacing;
