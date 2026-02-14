/**
 * Cart API Service
 */

import { api } from './client';
import type { Cart, CartItem } from '../types/api';

/**
 * Get user's cart
 */
export async function getCart(): Promise<Cart> {
  const response: any = await api.get('/cart', { requiresAuth: true });
  return response.data || response;
}

/**
 * Add item to cart
 */
export async function addToCart(
  productId: string,
  quantity: number = 1,
  size?: string,
  color?: string
): Promise<CartItem> {
  const response: any = await api.post(
    '/cart/items',
    { product_id: productId, quantity, size, color },
    { requiresAuth: true }
  );
  return response.data || response;
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<CartItem> {
  return api.put<CartItem>(
    `/cart/items/${itemId}`,
    { quantity },
    { requiresAuth: true }
  );
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string): Promise<void> {
  await api.delete(`/cart/items/${itemId}`, { requiresAuth: true });
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<void> {
  await api.delete('/cart', { requiresAuth: true });
}
