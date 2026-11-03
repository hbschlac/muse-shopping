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

/**
 * Add a partner-store product (reached through an agent bridge) to the cart.
 * The store prices it live; variantId is needed when it has sizes or colors.
 */
export async function addBridgeItemToCart(input: {
  partnerKey: string;
  productId: string;
  variantId?: string;
  quantity?: number;
}): Promise<CartItem> {
  const response: any = await api.post('/cart/bridge-items', input, { requiresAuth: true });
  return response.data || response;
}

export interface BridgeStoreCheckout {
  partnerKey: string;
  storeId: number;
  storeName: string;
  itemCount: number;
  checkout: {
    id: string | null;
    status: string | null;
    currency: string;
    totals: Record<string, { cents: number; label: string }>;
    continueUrl: string | null;
  };
}

/**
 * Build a checkout at each partner store in the cart. The shopper pays on the
 * store's own page (continueUrl); Muse does not charge for these items.
 */
export async function startBridgeCheckout(partnerKeys?: string[]): Promise<{
  stores: BridgeStoreCheckout[];
  errors: { partnerKey: string; storeName: string; message: string }[];
}> {
  const response: any = await api.post(
    '/cart/bridge-checkout',
    partnerKeys ? { partnerKeys } : {},
    { requiresAuth: true }
  );
  return response.data || response;
}

export interface ShipTo {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
  hasPhone?: boolean;
}

/** The address Muse fills in on partner-store checkouts (null if none saved). */
export async function getShippingAddress(): Promise<ShipTo | null> {
  const response: any = await api.get('/cart/shipping-address', { requiresAuth: true });
  return response?.data ?? null;
}

export async function saveShippingAddress(address: ShipTo): Promise<ShipTo> {
  const response: any = await api.put('/cart/shipping-address', address, { requiresAuth: true });
  return response.data || response;
}
