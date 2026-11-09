/**
 * Item watches at partner stores: Notify me on a sold-out size (kind 'size')
 * and price watches on saved items (kind 'price').
 */

import { api } from './client';

export type WatchKind = 'size' | 'price';

export interface ItemWatch {
  id: number;
  storeKey: string;
  itemId: string;
  variantId: string | null;
  size: string | null;
  color: string | null;
  kind: WatchKind;
  active: boolean;
  title: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string | null;
  createdAt: string;
}

export interface NewWatch {
  storeKey: string;
  itemId: string;
  kind: WatchKind;
  variantId?: string | null;
  size?: string | null;
  color?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  priceCents?: number | null;
  currency?: string | null;
}

export async function listWatches(filter: { store?: string; item?: string } = {}): Promise<ItemWatch[]> {
  const qs = new URLSearchParams();
  if (filter.store) qs.set('store', filter.store);
  if (filter.item) qs.set('item', filter.item);
  const response: any = await api.get(`/watches${qs.toString() ? `?${qs}` : ''}`, { requiresAuth: true });
  return (response.data || response).watches || [];
}

export async function createWatch(input: NewWatch): Promise<ItemWatch> {
  const response: any = await api.post('/watches', input, { requiresAuth: true });
  return (response.data || response).watch;
}

export async function removeWatch(id: number): Promise<void> {
  await api.delete(`/watches/${id}`, { requiresAuth: true });
}
