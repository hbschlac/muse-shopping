/**
 * Partner stores reached through agent bridges (Shopify and other UCP stores).
 * Every call asks the store directly, so prices, sizes and stock are live.
 * Shopify's terms say not to cache these results or images.
 */

import { api } from './client';

export interface Money {
  cents: number;
  currency: string;
}

export interface BridgeVariant {
  id: string;
  sku: string | null;
  title: string | null;
  price: Money | null;
  available: boolean | null;
  options: Record<string, string>;
  imageUrl: string | null;
}

export interface BridgeProduct {
  partnerKey: string;
  brand: string;
  id: string;
  title: string;
  description: string;
  url: string | null;
  imageUrl: string | null;
  price: Money | null;
  maxPrice: Money | null;
  compareAtPrice: Money | null;
  available: boolean | null;
  variants: BridgeVariant[];
}

export async function searchPartnerStores(query: string): Promise<{
  products: BridgeProduct[];
  errors: { partnerKey: string; message: string }[];
}> {
  const response: any = await api.get(`/bridges/search?q=${encodeURIComponent(query)}`);
  return response.data || response;
}

export async function getPartnerProduct(partnerKey: string, productId: string): Promise<BridgeProduct | null> {
  const response: any = await api.get(
    `/bridges/${encodeURIComponent(partnerKey)}/product?id=${encodeURIComponent(productId)}`
  );
  return (response.data || response).product || null;
}

export function partnerProductHref(p: { partnerKey: string; id: string }): string {
  return `/store-product?store=${encodeURIComponent(p.partnerKey)}&id=${encodeURIComponent(p.id)}`;
}

export function formatMoney(m: Money | null | undefined): string {
  if (!m) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency || 'USD' }).format(m.cents / 100);
}
