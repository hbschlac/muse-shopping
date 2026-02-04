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
