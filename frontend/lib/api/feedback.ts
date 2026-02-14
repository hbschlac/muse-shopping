import { api } from './client';

export interface FeedbackSubmission {
  category: 'bug' | 'feature_request' | 'tech_help' | 'complaint' | 'question' | 'other';
  subject: string;
  message: string;
  email: string;
  fullName?: string;
}

export interface FeedbackResponse {
  ticketNumber: string;
  status: string;
  createdAt: string;
}

export interface Feedback {
  id: number;
  ticket_number: string;
  user_id?: number;
  email: string;
  full_name?: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to?: number;
  admin_notes?: string;
  resolution_notes?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackResponseMessage {
  id: number;
  feedback_id: number;
  admin_id?: number;
  admin_name?: string;
  message: string;
  is_public: boolean;
  created_at: string;
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.append(key, String(value));
    }
  }
  const built = qs.toString();
  return built ? `?${built}` : '';
}

export async function submitFeedback(data: FeedbackSubmission): Promise<FeedbackResponse> {
  const response = await api.post<{ success: boolean; data: FeedbackResponse }>('/feedback', data);
  return response.data;
}

export async function getFeedbackByTicket(ticketNumber: string): Promise<{
  feedback: Feedback;
  responses: FeedbackResponseMessage[];
}> {
  const response = await api.get<{
    success: boolean;
    data: { feedback: Feedback; responses: FeedbackResponseMessage[] };
  }>(`/feedback/${ticketNumber}`, { requiresAuth: true });
  return response.data;
}

export async function getMyFeedback(params?: {
  limit?: number;
  offset?: number;
}): Promise<Feedback[]> {
  const query = buildQuery(params);
  const response = await api.get<{ success: boolean; data: Feedback[] }>(
    `/feedback/my-submissions${query}`,
    { requiresAuth: true }
  );
  return response.data;
}

export async function getAllFeedback(params?: {
  status?: string;
  category?: string;
  priority?: string;
  userId?: number;
  assignedTo?: number;
  limit?: number;
  offset?: number;
}): Promise<Feedback[]> {
  const query = buildQuery(params);
  const response = await api.get<{ success: boolean; data: Feedback[] }>(`/feedback${query}`, {
    requiresAuth: true,
  });
  return response.data;
}

export async function updateFeedback(
  ticketNumber: string,
  updates: {
    status?: string;
    priority?: string;
    assignedTo?: number;
    adminNotes?: string;
    resolutionNotes?: string;
  }
): Promise<Feedback> {
  const response = await api.patch<{ success: boolean; data: Feedback }>(
    `/feedback/${ticketNumber}`,
    updates,
    { requiresAuth: true }
  );
  return response.data;
}

export async function addFeedbackResponse(
  ticketNumber: string,
  data: {
    message: string;
    isPublic?: boolean;
  }
): Promise<FeedbackResponseMessage> {
  const response = await api.post<{ success: boolean; data: FeedbackResponseMessage }>(
    `/feedback/${ticketNumber}/responses`,
    data,
    { requiresAuth: true }
  );
  return response.data;
}

export async function getFeedbackStats(): Promise<{
  total_submissions: number;
  new_count: number;
  in_review_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  bug_count: number;
  feature_request_count: number;
  tech_help_count: number;
  complaint_count: number;
  question_count: number;
  urgent_count: number;
  high_count: number;
  avg_resolution_hours: number;
}> {
  const response = await api.get<{
    success: boolean;
    data: {
      total_submissions: number;
      new_count: number;
      in_review_count: number;
      in_progress_count: number;
      resolved_count: number;
      closed_count: number;
      bug_count: number;
      feature_request_count: number;
      tech_help_count: number;
      complaint_count: number;
      question_count: number;
      urgent_count: number;
      high_count: number;
      avg_resolution_hours: number;
    };
  }>('/feedback/stats', { requiresAuth: true });
  return response.data;
}
