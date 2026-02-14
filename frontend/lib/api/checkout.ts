/**
 * Checkout API Service
 */

import { api } from './client';
import type {
  CheckoutReadiness,
  CheckoutSession,
  CheckoutShippingAddress,
  CheckoutRecipient,
  CheckoutBillingPayload,
  CheckoutPaymentPayload,
  CheckoutPromoPayload,
  CheckoutShippingSelectionsPayload,
  CheckoutPlaceOrdersResult,
} from '../types/api';

export async function getCheckoutReadiness(): Promise<CheckoutReadiness> {
  return api.get<CheckoutReadiness>('/checkout/readiness', { requiresAuth: true });
}

export async function initiateCheckoutSession(): Promise<CheckoutSession> {
  return api.post<CheckoutSession>('/checkout/sessions', {}, { requiresAuth: true });
}

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  return api.get<CheckoutSession>(`/checkout/sessions/${sessionId}`, { requiresAuth: true });
}

export async function setCheckoutShippingAddress(
  sessionId: string,
  address: CheckoutShippingAddress
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/shipping`, address, {
    requiresAuth: true,
  });
}

export async function setCheckoutRecipient(
  sessionId: string,
  recipient: CheckoutRecipient
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/recipient`, recipient, {
    requiresAuth: true,
  });
}

export async function setCheckoutBilling(
  sessionId: string,
  payload: CheckoutBillingPayload
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/billing`, payload, {
    requiresAuth: true,
  });
}

export async function setCheckoutPaymentMethod(
  sessionId: string,
  payload: CheckoutPaymentPayload
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/payment`, payload, {
    requiresAuth: true,
  });
}

export async function applyCheckoutPromoCode(
  sessionId: string,
  payload: CheckoutPromoPayload
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/promo`, payload, {
    requiresAuth: true,
  });
}

export async function setCheckoutShippingSelections(
  sessionId: string,
  payload: CheckoutShippingSelectionsPayload
): Promise<CheckoutSession> {
  return api.put<CheckoutSession>(`/checkout/sessions/${sessionId}/shipping-options`, payload, {
    requiresAuth: true,
  });
}

export async function placeCheckoutOrders(sessionId: string): Promise<CheckoutPlaceOrdersResult> {
  return api.post<CheckoutPlaceOrdersResult>(`/checkout/sessions/${sessionId}/place`, {}, {
    requiresAuth: true,
  });
}
