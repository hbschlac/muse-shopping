/**
 * Retailer Integration API Service
 * Connects to backend retailer APIs (Target, Walmart, Nordstrom)
 */

import { api } from './client';

export interface RetailerProduct {
  retailer_id: string;
  retailer_name: string;
  product_id: string;
  name: string;
  price: number;
  original_price?: number;
  currency: string;
  image_url: string;
  product_url: string;
  in_stock: boolean;
  availability?: {
    online: boolean;
    in_store?: boolean;
    shipping_available?: boolean;
  };
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    in_stock: boolean;
  }>;
  shipping_info?: {
    free_shipping: boolean;
    estimated_delivery?: string;
  };
  promotions?: Array<{
    type: string;
    description: string;
    discount_percent?: number;
  }>;
}

export interface RetailerSearchParams {
  query?: string;
  category?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  page?: number;
  limit?: number;
}

export interface RetailerAuthStatus {
  retailer_id: string;
  retailer_name: string;
  is_connected: boolean;
  access_token_expires_at?: string;
  scopes?: string[];
}

/**
 * Get all available retailers
 */
export async function getRetailers(): Promise<Array<{
  id: string;
  name: string;
  logo_url?: string;
  supports_oauth: boolean;
}>> {
  return api.get('/store-connections/retailers');
}

/**
 * Get user's connected retailers
 */
export async function getConnectedRetailers(): Promise<RetailerAuthStatus[]> {
  return api.get('/store-connections', { requiresAuth: true });
}

/**
 * Initiate OAuth flow for retailer
 */
export function initiateRetailerAuth(retailerId: string): void {
  const redirectUri = `${window.location.origin}/auth/retailer/callback`;
  const state = Math.random().toString(36).substring(7);

  // Store state for verification
  sessionStorage.setItem('retailer_auth_state', state);
  sessionStorage.setItem('retailer_auth_id', retailerId);

  const authUrl = `/api/v1/store-connections/${retailerId}/authorize?` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;

  window.location.href = authUrl;
}

/**
 * Complete retailer OAuth flow
 */
export async function completeRetailerAuth(
  retailerId: string,
  code: string,
  state: string
): Promise<RetailerAuthStatus> {
  // Verify state matches
  const savedState = sessionStorage.getItem('retailer_auth_state');
  if (state !== savedState) {
    throw new Error('Invalid state parameter');
  }

  const response = await api.post<RetailerAuthStatus>(
    `/store-connections/${retailerId}/callback`,
    { code, state },
    { requiresAuth: true }
  );

  // Clean up session storage
  sessionStorage.removeItem('retailer_auth_state');
  sessionStorage.removeItem('retailer_auth_id');

  return response;
}

/**
 * Disconnect retailer account
 */
export async function disconnectRetailer(retailerId: string): Promise<void> {
  await api.delete(`/store-connections/${retailerId}`, { requiresAuth: true });
}

/**
 * Search products from a specific retailer
 */
export async function searchRetailerProducts(
  retailerId: string,
  params: RetailerSearchParams
): Promise<{
  products: RetailerProduct[];
  total: number;
  page: number;
  has_more: boolean;
}> {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('q', params.query);
  if (params.category) queryParams.append('category', params.category);
  if (params.brand) queryParams.append('brand', params.brand);
  if (params.price_min) queryParams.append('price_min', params.price_min.toString());
  if (params.price_max) queryParams.append('price_max', params.price_max.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  return api.get(
    `/store-connections/${retailerId}/products?${queryParams.toString()}`,
    { requiresAuth: true }
  );
}

/**
 * Get real-time product data from retailer
 */
export async function getRetailerProductDetails(
  productId: string
): Promise<RetailerProduct> {
  return api.get(`/products/${productId}`, { requiresAuth: true });
}

/**
 * Get checkout link for product
 */
export async function getRetailerCheckoutLink(
  productId: string,
  variantId?: string
): Promise<{ checkout_url: string; affiliate_link: boolean }> {
  const params = variantId ? `?variant_id=${variantId}` : '';
  return api.get(`/products/${productId}/checkout-link${params}`, {
    requiresAuth: true,
  });
}

/**
 * Track product interaction (view, click, cart add)
 */
export async function trackProductInteraction(
  productId: string,
  interactionType: 'view' | 'click' | 'cart_add'
): Promise<void> {
  await api.post(
    `/products/${productId}/interactions`,
    { interaction_type: interactionType },
    { requiresAuth: true }
  );
}

/**
 * Get batch product data (for cart/saved items)
 */
export async function getBatchProductData(
  productIds: string[]
): Promise<RetailerProduct[]> {
  return api.post(
    '/products/cart-batch',
    { productIds },
    { requiresAuth: true }
  );
}

/**
 * Import products from retailer catalog (admin)
 */
export async function importRetailerCatalog(
  retailerId: string,
  jobType: 'full' | 'price_update' = 'full'
): Promise<{
  success: boolean;
  stats: {
    processed: number;
    created: number;
    updated: number;
    errors: number;
  };
}> {
  return api.post(
    '/products/admin/batch-import',
    {
      storeId: retailerId,
      jobType,
    },
    { requiresAuth: true }
  );
}

/**
 * Get product cache statistics
 */
export async function getProductCacheStats(hours: number = 24): Promise<{
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate_percent: number;
  avg_cache_age_minutes: number;
}> {
  return api.get(`/products/stats/cache?hours=${hours}`, {
    requiresAuth: true,
  });
}

/**
 * Get API cost statistics
 */
export async function getAPICostStats(days: number = 7): Promise<Array<{
  store_id: string;
  store_name: string;
  total_calls: number;
  estimated_cost_cents: number;
  date: string;
}>> {
  return api.get(`/products/stats/cost?days=${days}`, {
    requiresAuth: true,
  });
}

/**
 * Get batch import statistics
 */
export async function getBatchImportStats(days: number = 7): Promise<Array<{
  store_id: string;
  store_name: string;
  total_processed: number;
  total_created: number;
  total_updated: number;
  last_import_at: string;
}>> {
  return api.get(`/products/stats/batch-imports?days=${days}`, {
    requiresAuth: true,
  });
}
