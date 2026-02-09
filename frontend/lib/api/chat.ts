/**
 * Chat API Service (Muse AI Stylist)
 */

import { api } from './client';
import type { ChatMessage, ChatResponse, Product } from '../types/api';

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  context?: Record<string, any>;
  session_id?: string;
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
}

function unwrap<T>(response: T | Envelope<T>): T {
  if (response && typeof response === 'object' && 'data' in (response as Envelope<T>)) {
    return ((response as Envelope<T>).data ?? response) as T;
  }
  return response as T;
}

function normalizeChatResponse(raw: any): ChatResponse {
  const response = unwrap<any>(raw) || {};
  return {
    ...response,
    products: response.products || response.items || [],
    suggestions: response.suggestions || response.followups || [],
  };
}

/**
 * Send message to Muse chat
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const raw = await api.post<any>('/chat', request, { requiresAuth: true });
  return normalizeChatResponse(raw);
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const raw = await api.get<any>(`/chat/sessions/${sessionId}/messages`, {
    requiresAuth: true,
  });
  return unwrap<ChatMessage[]>(raw) || [];
}

/**
 * Get product recommendations from chat
 */
export async function getChatRecommendations(
  message: string,
  sessionId?: string
): Promise<Product[]> {
  const response = await sendChatMessage({ message, session_id: sessionId });
  return response.products || [];
}

/**
 * Submit feedback on chat response
 */
export async function submitChatFeedback(
  _sessionId: string,
  messageId: string,
  rating: 'positive' | 'negative',
  feedback?: string
): Promise<void> {
  const numericRating = rating === 'positive' ? 5 : 1;
  await api.post(
    '/chat/feedback',
    { message_id: messageId, rating: numericRating, notes: feedback },
    { requiresAuth: true }
  );
}
