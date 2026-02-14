/**
 * Products API Service
 */

import { api } from './client';
import type { Product, ProductDetails, SearchResponse, SearchFilters } from '../types/api';

/**
 * Get product details by ID
 */
export async function getProduct(productId: string): Promise<ProductDetails> {
  return api.get<ProductDetails>(`/products/${productId}`);
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  filters?: SearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (filters) {
    if (filters.brands?.length) {
      params.append('brands', filters.brands.join(','));
    }
    if (filters.categories?.length) {
      params.append('categories', filters.categories.join(','));
    }
    if (filters.price_min !== undefined) {
      params.append('price_min', filters.price_min.toString());
    }
    if (filters.price_max !== undefined) {
      params.append('price_max', filters.price_max.toString());
    }
    if (filters.sizes?.length) {
      params.append('sizes', filters.sizes.join(','));
    }
    if (filters.colors?.length) {
      params.append('colors', filters.colors.join(','));
    }
    if (filters.in_stock_only) {
      params.append('in_stock_only', 'true');
    }
  }

  return api.get<SearchResponse>(`/products/search?${params.toString()}`);
}

/**
 * Get products by brand
 */
export async function getProductsByBrand(
  brandId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return api.get<SearchResponse>(
    `/products?brand_id=${brandId}&page=${page}&page_size=${pageSize}`
  );
}

/**
 * Get product recommendations for a user
 */
export async function getRecommendations(
  userId: string,
  limit: number = 20
): Promise<Product[]> {
  return api.get<Product[]>(
    `/products/recommendations?user_id=${userId}&limit=${limit}`,
    { requiresAuth: true }
  );
}

/**
 * Get real-time product data (price, availability)
 */
export async function getRealtimeProductData(productId: string): Promise<{
  price: number;
  in_stock: boolean;
  updated_at: string;
}> {
  return api.get(`/products/${productId}/realtime`);
}

/**
 * Get checkout link for a product
 */
export async function getCheckoutLink(
  productId: string,
  size?: string,
  color?: string
): Promise<{ checkout_url: string }> {
  const params = new URLSearchParams();
  if (size) params.append('size', size);
  if (color) params.append('color', color);

  return api.get<{ checkout_url: string }>(
    `/products/${productId}/checkout-link?${params.toString()}`
  );
}

/**
 * Get product reviews
 */
export async function getProductReviews(
  productId: string,
  limit: number = 5,
  offset: number = 0,
  sortBy: 'newest' | 'helpful' = 'newest'
): Promise<{
  summary: {
    total_reviews: number;
    rating: number;
    count_5: number;
    count_4: number;
    count_3: number;
    count_2: number;
    count_1: number;
  };
  reviews: Array<{
    id: number;
    rating: number;
    title: string;
    body: string;
    helpful_count: number;
    created_at: string;
    source_retailer: string | null;
    source_url: string | null;
    reviewer_name: string;
  }>;
}> {
  const response: any = await api.get(
    `/items/${productId}/reviews?limit=${limit}&offset=${offset}&sort_by=${sortBy}`
  );
  return response.data || response;
}

/**
 * Get product listings (price comparison)
 */
export async function getProductListings(productId: string): Promise<{
  listings: Array<{
    id: number;
    retailer_id: number;
    retailer_name: string;
    retailer_logo: string | null;
    product_url: string;
    affiliate_url: string | null;
    price: number;
    sale_price: number | null;
    currency: string;
    in_stock: boolean;
    sizes_available: string[] | null;
    colors_available: string[] | null;
    last_scraped_at: string;
  }>;
}> {
  const response: any = await api.get(`/items/${productId}`);
  const itemDetails = response.data || response;
  return {
    listings: itemDetails.listings || [],
  };
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(
  productId: string,
  reviewId: number
): Promise<{ helpful_count: number }> {
  return api.post(`/items/${productId}/reviews/${reviewId}/helpful`, {});
}

/**
 * Create a product review
 */
export async function createProductReview(
  productId: string,
  review: {
    rating: number;
    title?: string;
    body: string;
    reviewer_name?: string;
  }
): Promise<{
  id: number;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}> {
  return api.post(`/items/${productId}/reviews`, review);
}

/**
 * Get user's favorited items
 */
export async function getFavorites(
  limit: number = 50,
  offset: number = 0
): Promise<{ items: any[]; total: number }> {
  const response: any = await api.get(
    `/items/favorites?limit=${limit}&offset=${offset}`,
    { requiresAuth: true }
  );
  return response.data || response;
}

/**
 * Add item to favorites
 */
export async function addToFavorites(
  itemId: string,
  notes?: string
): Promise<any> {
  const response: any = await api.post(
    `/items/${itemId}/favorite`,
    { notes },
    { requiresAuth: true }
  );
  return response.data || response;
}

/**
 * Remove item from favorites
 */
export async function removeFromFavorites(itemId: string): Promise<void> {
  await api.delete(`/items/${itemId}/favorite`, { requiresAuth: true });
}
