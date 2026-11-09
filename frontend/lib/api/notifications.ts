/**
 * Push alerts, notification settings and alert history.
 */

import { api } from './client';

export type AlertType = 'back_in_stock' | 'price_drop' | 'new_item' | 'sale' | 'cashback';
export type AlertMode = 'push' | 'digest' | 'off';

export interface MutedSource {
  store_key: string;
  item_id?: string;
  type?: AlertType;
  label?: string;
}

export interface NotificationPrefs {
  types: Record<AlertType, AlertMode>;
  muted: MutedSource[];
  quiet_start: string;
  quiet_end: string;
  digest_time: string;
  timezone: string;
  daily_cap: number;
  price_drop_pct: number;
}

export interface PushStatus {
  configured: boolean;
  publicKey: string | null;
  devices: number;
}

export interface AlertRow {
  id: number;
  alert_type: AlertType | 'test';
  store_key: string | null;
  item_id: string | null;
  title: string;
  body: string | null;
  url: string | null;
  image_url: string | null;
  status: 'pending' | 'sent' | 'held' | 'digest' | 'off' | 'no_device' | 'not_configured' | 'failed';
  reason: string | null;
  created_at: string;
  sent_at: string | null;
  digested_at: string | null;
  opened_at: string | null;
  dismissed_at: string | null;
  fewer_at: string | null;
}

interface Envelope<T> { success: boolean; data: T }

const auth = { requiresAuth: true };

export async function getPushStatus(): Promise<PushStatus> {
  return (await api.get<Envelope<PushStatus>>('/notifications/status', auth)).data;
}

export async function getPublicKey(): Promise<{ configured: boolean; publicKey: string | null }> {
  return (await api.get<Envelope<{ configured: boolean; publicKey: string | null }>>('/notifications/vapid-public-key')).data;
}

export async function saveSubscription(subscription: PushSubscriptionJSON): Promise<PushStatus> {
  return (await api.post<Envelope<PushStatus>>('/notifications/subscriptions', { subscription }, auth)).data;
}

export async function removeSubscription(endpoint: string): Promise<PushStatus> {
  return (await api.delete<Envelope<PushStatus>>('/notifications/subscriptions', {
    ...auth,
    body: JSON.stringify({ endpoint }),
  })).data;
}

export async function getPrefs(): Promise<NotificationPrefs> {
  return (await api.get<Envelope<NotificationPrefs>>('/notifications/prefs', auth)).data;
}

export async function updatePrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  return (await api.put<Envelope<NotificationPrefs>>('/notifications/prefs', patch, auth)).data;
}

export async function sendTestPush(): Promise<{ configured: boolean; devices: number; delivered: number; url?: string }> {
  return (await api.post<Envelope<{ configured: boolean; devices: number; delivered: number; url?: string }>>('/notifications/test', {}, auth)).data;
}

export async function getAlerts(before?: number): Promise<{ alerts: AlertRow[]; next: number | null }> {
  const q = before ? `?before=${before}` : '';
  return (await api.get<Envelope<{ alerts: AlertRow[]; next: number | null }>>(`/notifications/alerts${q}`, auth)).data;
}

export async function fewerLikeThis(alertId: number): Promise<{ prefs: NotificationPrefs; message: string }> {
  return (await api.post<Envelope<{ prefs: NotificationPrefs; message: string }>>(`/notifications/alerts/${alertId}/fewer`, {}, auth)).data;
}
