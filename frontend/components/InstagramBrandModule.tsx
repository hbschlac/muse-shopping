'use client';

import { useEffect, useCallback } from 'react';
import HeroCarouselLayout from './HeroCarouselLayout';
import FeaturedGridLayout from './FeaturedGridLayout';
import { trackModuleImpression, trackModuleProductClick } from '@/lib/api/experiments';
import type { BrandModule as BrandModuleType } from '@/lib/types/api';

interface InstagramBrandModuleProps {
  module: BrandModuleType;
  onView?: () => void;
  onProductClick?: () => void;
}

/**
 * Instagram-Style Brand Module Wrapper
 * Renders different layouts based on module configuration
 * Tracks A/B test impressions and clicks
 */
export default function InstagramBrandModule({
  module,
  onView,
  onProductClick,
}: InstagramBrandModuleProps) {
  // Skip rendering if no products
  if (!module.products || module.products.length === 0) {
    return null;
  }

  // Track module impression on mount (A/B testing)
  useEffect(() => {
    if (module.experiment &&
        module.experiment.experiment_id &&
        module.experiment.variant_id &&
        module.experiment.in_experiment !== undefined) {
      trackModuleImpression(parseInt(module.id), {
        experiment_id: module.experiment.experiment_id,
        variant_id: module.experiment.variant_id,
        in_experiment: module.experiment.in_experiment,
      });
    }

    // Call parent onView callback
    if (onView) {
      onView();
    }
  }, [module.id, module.experiment, onView]);

  // Wrap product click handler with experiment tracking
  const handleProductClick = useCallback(() => {
    if (module.experiment) {
      // Note: We'd need product ID here, but that's passed from child components
      // Child components will handle trackModuleProductClick directly
    }

    if (onProductClick) {
      onProductClick();
    }
  }, [module.experiment, onProductClick]);

  // Render based on layout type
  switch (module.layout?.type) {
    case 'hero_carousel':
      return (
        <HeroCarouselLayout
          module={module}
          onView={() => {}} // Already tracked in useEffect above
          onProductClick={handleProductClick}
        />
      );

    case 'featured_grid':
      return (
        <FeaturedGridLayout
          module={module}
          onView={() => {}} // Already tracked in useEffect above
          onProductClick={handleProductClick}
        />
      );

    case 'carousel':
    default:
      // Fallback to hero_carousel for legacy modules
      return (
        <HeroCarouselLayout
          module={module}
          onView={() => {}} // Already tracked in useEffect above
          onProductClick={handleProductClick}
        />
      );
  }
}
