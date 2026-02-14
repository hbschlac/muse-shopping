import { useCallback } from 'react';

interface ActivityData {
  activityType: string;
  activityCategory: 'browsing' | 'engagement' | 'conversion' | 'social';
  pageUrl?: string;
  pageType?: string;
  productId?: number;
  brandId?: number;
  itemId?: number;
  searchQuery?: string;
  searchFilters?: any;
  interactionData?: any;
  moduleId?: number;
  positionInFeed?: number;
  durationSeconds?: number;
}

export function useActivityTracking() {
  const trackActivity = useCallback(async (data: ActivityData) => {
    try {
      // Check if user has consented to data collection
      const preferences = localStorage.getItem('privacy_preferences');
      if (preferences) {
        const { data_collection } = JSON.parse(preferences);
        if (!data_collection) {
          return;
        }
      } else {
        // No consent given yet, skip tracking
        return;
      }

      // Add viewport dimensions
      const activityData = {
        ...data,
        pageUrl: data.pageUrl || window.location.pathname,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };

      const response = await fetch('/api/shopper/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        console.error('Failed to track activity:', response.statusText);
      }
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, []);

  const trackPageView = useCallback(
    (pageType: string, pageUrl?: string) => {
      trackActivity({
        activityType: 'page_view',
        activityCategory: 'browsing',
        pageType,
        pageUrl: pageUrl || window.location.pathname,
      });
    },
    [trackActivity]
  );

  const trackProductView = useCallback(
    (productId: number, brandId?: number) => {
      trackActivity({
        activityType: 'product_view',
        activityCategory: 'browsing',
        pageType: 'product_detail',
        productId,
        brandId,
      });
    },
    [trackActivity]
  );

  const trackClick = useCallback(
    (itemId: number, moduleId?: number, position?: number) => {
      trackActivity({
        activityType: 'click',
        activityCategory: 'engagement',
        itemId,
        moduleId,
        positionInFeed: position,
      });
    },
    [trackActivity]
  );

  const trackAddToCart = useCallback(
    (productId: number, brandId?: number, priceCents?: number) => {
      trackActivity({
        activityType: 'add_to_cart',
        activityCategory: 'conversion',
        productId,
        brandId,
        interactionData: priceCents ? { value_cents: priceCents } : undefined,
      });
    },
    [trackActivity]
  );

  const trackPurchase = useCallback(
    (orderId: number, totalCents: number) => {
      trackActivity({
        activityType: 'purchase',
        activityCategory: 'conversion',
        pageType: 'checkout',
        interactionData: {
          order_id: orderId,
          value_cents: totalCents,
        },
      });
    },
    [trackActivity]
  );

  const trackSearch = useCallback(
    (query: string, filters?: any) => {
      trackActivity({
        activityType: 'search',
        activityCategory: 'browsing',
        searchQuery: query,
        searchFilters: filters,
      });
    },
    [trackActivity]
  );

  const trackWishlistAdd = useCallback(
    (productId: number, brandId?: number) => {
      trackActivity({
        activityType: 'wishlist_add',
        activityCategory: 'engagement',
        productId,
        brandId,
      });
    },
    [trackActivity]
  );

  return {
    trackActivity,
    trackPageView,
    trackProductView,
    trackClick,
    trackAddToCart,
    trackPurchase,
    trackSearch,
    trackWishlistAdd,
  };
}
