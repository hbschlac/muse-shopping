/**
 * Saved Items API Service
 */

import { api } from './client';
import type { SavedItem, Product } from '../types/api';

/**
 * Get all saved items for a user
 */
export async function getSavedItems(): Promise<SavedItem[]> {
  return api.get<SavedItem[]>('/items/saved', { requiresAuth: true });
}

/**
 * Save a product
 */
export async function saveProduct(
  productId: string,
  notes?: string
): Promise<SavedItem> {
  return api.post<SavedItem>(
    '/items/saved',
    { product_id: productId, notes },
    { requiresAuth: true }
  );
}

/**
 * Remove a saved product
 */
export async function unsaveProduct(savedItemId: string): Promise<void> {
  await api.delete(`/items/saved/${savedItemId}`, { requiresAuth: true });
}

/**
 * Update saved item notes
 */
export async function updateSavedItemNotes(
  savedItemId: string,
  notes: string
): Promise<SavedItem> {
  return api.put<SavedItem>(
    `/items/saved/${savedItemId}`,
    { notes },
    { requiresAuth: true }
  );
}

/**
 * Check if product is saved
 */
export async function isProductSaved(productId: string): Promise<boolean> {
  try {
    const saved = await api.get<{ is_saved: boolean }>(
      `/items/saved/check/${productId}`,
      { requiresAuth: true }
    );
    return saved.is_saved;
  } catch {
    return false;
  }
}
