/**
 * Brands API Service
 */

import { api } from './client';
import type { Brand } from '../types/api';

/**
 * Get all brands
 */
export async function getBrands(): Promise<Brand[]> {
  return api.get<Brand[]>('/brands');
}

/**
 * Get brand by ID
 */
export async function getBrand(brandId: string): Promise<Brand> {
  return api.get<Brand>(`/brands/${brandId}`);
}

/**
 * Get brand by slug
 */
export async function getBrandBySlug(slug: string): Promise<Brand> {
  return api.get<Brand>(`/brands/slug/${slug}`);
}

/**
 * Search brands
 */
export async function searchBrands(query: string): Promise<Brand[]> {
  return api.get<Brand[]>(`/brands/search?q=${encodeURIComponent(query)}`);
}

/**
 * Get user's favorite brands
 */
export async function getFavoriteBrands(userId: string): Promise<Brand[]> {
  return api.get<Brand[]>(`/brands/favorites?user_id=${userId}`, {
    requiresAuth: true,
  });
}

/**
 * Add brand to favorites
 */
export async function addFavoriteBrand(brandId: string): Promise<void> {
  await api.post('/brands/favorites', { brand_id: brandId }, { requiresAuth: true });
}

/**
 * Remove brand from favorites
 */
export async function removeFavoriteBrand(brandId: string): Promise<void> {
  await api.delete(`/brands/favorites/${brandId}`, { requiresAuth: true });
}
