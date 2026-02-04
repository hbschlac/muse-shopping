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

/**
 * Send message to Muse chat
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  return api.post<ChatResponse>('/chat', request, { requiresAuth: true });
}

/**
 * Get chat history for a session
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  return api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`, {
    requiresAuth: true,
  });
}

/**
 * Get product recommendations from chat
 */
export async function getChatRecommendations(
  message: string,
  sessionId?: string
): Promise<Product[]> {
  const response = await api.post<ChatResponse>(
    '/chat',
    { message, session_id: sessionId },
    { requiresAuth: true }
  );
  return response.products || [];
}

/**
 * Submit feedback on chat response
 */
export async function submitChatFeedback(
  sessionId: string,
  messageId: string,
  rating: 'positive' | 'negative',
  feedback?: string
): Promise<void> {
  await api.post(
    '/chat/feedback',
    { session_id: sessionId, message_id: messageId, rating, feedback },
    { requiresAuth: true }
  );
}
