import { getMuseLogo, type LogoVariant, type LogoStyle } from '@/lib/brand';

interface MuseLogoProps {
  /** Logo variant - wordmark (full logo) or lettermark (icon only) */
  variant?: LogoVariant;
  /** Logo style - gradient, white, grey, or solid */
  style?: LogoStyle;
  /** Background context - automatically selects appropriate logo */
  background?: 'light' | 'dark';
  /** CSS classes for the image */
  className?: string;
  /** Alt text (defaults to "Muse") */
  alt?: string;
  /** Priority loading */
  priority?: boolean;
}

/**
 * Muse Logo Component
 * Automatically selects the appropriate logo variant based on context
 *
 * @example
 * // Default gradient wordmark for light backgrounds
 * <MuseLogo className="h-16" />
 *
 * @example
 * // White logo for dark backgrounds
 * <MuseLogo background="dark" className="h-16" />
 *
 * @example
 * // White lettermark icon
 * <MuseLogo variant="lettermark" style="white" className="h-8" />
 */
export default function MuseLogo({
  variant,
  style,
  background,
  className,
  alt = 'Muse',
  priority = false,
}: MuseLogoProps) {
  const logoPath = getMuseLogo({ variant, style, background });

  return (
    <img
      src={logoPath}
      alt={alt}
      className={className}
      loading={priority ? undefined : 'lazy'}
    />
  );
}
