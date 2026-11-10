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

// One-step agent checkout: one review, one confirm, Muse pays each store.

type Wrapped<T> = T | { data: T };
const unwrap = <T,>(r: Wrapped<T>): T =>
  r && typeof r === 'object' && 'data' in r ? (r as { data: T }).data : (r as T);

export type CheckoutRail = 'shop_pay' | 'visa_ic' | 'stripe_spt' | 'google_pay' | 'handoff' | string;

/** One item exactly as the shopper approves it (also what the agent activity log records). */
export interface AgentCheckoutItem {
  cartItemId?: number | null;
  productId?: string | null;
  variantId?: string | null;
  title?: string | null;
  variantTitle?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  cartPriceCents?: number | null;
  storePriceCents?: number | null;
  marketplace?: string | null;
  sellerName?: string | null;
  fulfilledBy?: string | null;
}

export interface AgentCheckoutStore {
  partnerKey: string;
  storeName: string;
  rail: CheckoutRail;
  railReason?: string;
  itemCount?: number;
  items?: AgentCheckoutItem[];
  ceilingCents: number | null;
  currency: string;
  continueUrl: string | null;
  status?: 'pending' | 'paid' | 'failed' | 'blocked' | 'handoff';
  orderId?: string | null;
  error?: string | null;
}

export interface AgentCheckoutReview {
  intentId: string;
  cartSessionId: string;
  expiresAt: string;
  totalCents: number;
  currency: string;
  stores: AgentCheckoutStore[];
  errors: { partnerKey: string; storeName: string; message: string }[];
  shipTo: ShipTo | null;
  summaryHash: string;
}

export interface AgentCheckoutResult {
  intentId: string;
  status: 'draft' | 'paying' | 'done' | 'cancelled' | 'expired';
  expiresAt: string;
  totalCents: number;
  currency: string;
  stores: AgentCheckoutStore[];
}

/** Build every partner store's checkout and save what the shopper is about to approve. */
export async function prepareAgentCheckout(): Promise<AgentCheckoutReview> {
  const response = (await api.post('/cart/agent-checkout', {}, { requiresAuth: true })) as Wrapped<AgentCheckoutReview>;
  return unwrap(response);
}

/**
 * The shopper's one confirm for the whole cart. summaryHash must be the one from the
 * review they were shown; the server refuses anything else.
 */
export async function confirmAgentCheckout(
  intentId: string,
  approval: { summaryHash: string; passkey?: unknown }
): Promise<AgentCheckoutResult> {
  const response = (await api.post(
    `/cart/agent-checkout/${encodeURIComponent(intentId)}/confirm`,
    approval,
    { requiresAuth: true }
  )) as Wrapped<AgentCheckoutResult>;
  return unwrap(response);
}

export async function cancelAgentCheckout(intentId: string): Promise<AgentCheckoutResult> {
  const response = (await api.post(
    `/cart/agent-checkout/${encodeURIComponent(intentId)}/cancel`,
    {},
    { requiresAuth: true }
  )) as Wrapped<AgentCheckoutResult>;
  return unwrap(response);
}

// Passkeys (Face ID / Touch ID) that approve a cart before Muse pays.

/** WebAuthn options for the passkey tap on this cart, or needsPasskey if none is set up. */
export async function getAgentCheckoutApprovalOptions(
  intentId: string
): Promise<{ needsPasskey: boolean; options?: unknown }> {
  const response = (await api.post(
    `/cart/agent-checkout/${encodeURIComponent(intentId)}/approval-options`,
    {},
    { requiresAuth: true }
  )) as Wrapped<{ needsPasskey: boolean; options?: unknown }>;
  return unwrap(response);
}

/** Emails the shopper a 6-digit code; Face ID setup needs it. */
export async function requestPasskeySetupCode(): Promise<{ sentTo: string; expiresInMinutes: number }> {
  const response = (await api.post('/passkeys/register/email-code', {}, { requiresAuth: true })) as Wrapped<{
    sentTo: string;
    expiresInMinutes: number;
  }>;
  return unwrap(response);
}

export async function getPasskeyRegistrationOptions(emailCode: string): Promise<unknown> {
  const response = (await api.post('/passkeys/register/options', { emailCode }, { requiresAuth: true })) as Wrapped<unknown>;
  return unwrap(response);
}

export async function verifyPasskeyRegistration(response: unknown, nickname?: string): Promise<{ id: string }> {
  const r = (await api.post('/passkeys/register/verify', { response, nickname }, { requiresAuth: true })) as Wrapped<{ id: string }>;
  return unwrap(r);
}
