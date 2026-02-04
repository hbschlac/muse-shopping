/**
 * Cart API Service
 */

import { api } from './client';
import type { Cart, CartItem } from '../types/api';

/**
 * Get user's cart
 */
export async function getCart(): Promise<Cart> {
  return api.get<Cart>('/cart', { requiresAuth: true });
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
  return api.post<CartItem>(
    '/cart/items',
    { product_id: productId, quantity, size, color },
    { requiresAuth: true }
  );
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
