/**
 * Store Accounts API Service
 */

import { api } from './client';
import type {
  StoreAccount,
  StoreAccountsSummary,
  StoreAccountPaymentMethodPayload,
} from '../types/api';

export async function getStoreAccounts(): Promise<{
  accounts: StoreAccount[];
  summary: StoreAccountsSummary;
}> {
  return api.get('/store-accounts', { requiresAuth: true });
}

export async function linkStoreAccount(storeId: number): Promise<{ account: StoreAccount }> {
  return api.post(`/store-accounts/${storeId}/link`, {}, { requiresAuth: true });
}

export async function unlinkStoreAccount(storeId: number): Promise<void> {
  await api.delete(`/store-accounts/${storeId}`, { requiresAuth: true });
}

export async function saveStorePaymentMethod(
  storeId: number,
  payload: StoreAccountPaymentMethodPayload
): Promise<{ account: StoreAccount }> {
  return api.post(`/store-accounts/${storeId}/payment-method`, payload, {
    requiresAuth: true,
  });
}

export async function getDetectedStoreAccounts(): Promise<{
  detected: StoreAccount[];
  count: number;
}> {
  return api.get('/store-accounts/detected', { requiresAuth: true });
}

export async function getStoreAccountsSummary(): Promise<{ summary: StoreAccountsSummary }> {
  return api.get('/store-accounts/summary', { requiresAuth: true });
}
