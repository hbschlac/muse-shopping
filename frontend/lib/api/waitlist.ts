/**
 * Waitlist API Service
 */

import { api } from './client';

export interface WaitlistSignupData {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  interest_categories?: string[];
  favorite_brands?: string[];
  price_range_preference?: 'budget' | 'mid-range' | 'luxury' | 'mixed';
  referral_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referral_code?: string;
}

export interface WaitlistSignupResponse {
  id: number;
  email: string;
  position: number;
  total: number;
  my_referral_code: string;
  priority_score: number;
  created_at: string;
}

export interface WaitlistStatusResponse {
  status: 'pending' | 'invited' | 'converted' | 'unsubscribed';
  position: number;
  total: number;
  my_referral_code: string;
  priority_score: number;
  created_at: string;
  invite_sent_at?: string;
}

export interface ReferralLinkResponse {
  referral_link: string;
  referral_code: string;
  referral_count: number;
}

export interface ReferralAnalytics {
  analytics: {
    signup_id: number;
    email: string;
    referral_code: string;
    user_id: number | null;
    total_shares: number;
    shares_last_7d: number;
    shares_last_30d: number;
    total_clicks: number;
    clicks_last_7d: number;
    clicks_last_30d: number;
    total_conversions: number;
    conversions_last_7d: number;
    conversions_last_30d: number;
    conversion_rate_percent: number;
    last_shared_at: string | null;
    last_clicked_at: string | null;
    last_conversion_at: string | null;
  } | null;
  shares: Array<{
    id: number;
    share_method: string;
    share_platform: string;
    shared_at: string;
  }>;
  clicks: Array<{
    id: number;
    clicked_at: string;
    converted: boolean;
    converted_at: string | null;
    clicked_by_email: string | null;
    utm_source: string | null;
    utm_medium: string | null;
  }>;
}

/**
 * Join the waitlist
 */
export async function joinWaitlist(data: WaitlistSignupData): Promise<WaitlistSignupResponse> {
  const response = await api.post<{ data: WaitlistSignupResponse }>('/waitlist/signup', data);
  return response.data;
}

/**
 * Check waitlist status by email
 */
export async function checkWaitlistStatus(email: string): Promise<WaitlistStatusResponse> {
  const response = await api.get<{ data: WaitlistStatusResponse }>(`/waitlist/status?email=${encodeURIComponent(email)}`);
  return response.data;
}

/**
 * Unsubscribe from waitlist
 */
export async function unsubscribeFromWaitlist(email: string): Promise<void> {
  await api.post('/waitlist/unsubscribe', { email });
}

/**
 * Get referral link for a user
 */
export async function getReferralLink(email: string): Promise<ReferralLinkResponse> {
  const response = await api.get<{ data: ReferralLinkResponse }>(`/waitlist/referral-link?email=${encodeURIComponent(email)}`);
  return response.data;
}

/**
 * Track when a user shares their referral link
 */
export async function trackReferralShare(email: string, shareMethod: string, sharePlatform?: string): Promise<void> {
  await api.post('/waitlist/track-share', {
    email,
    share_method: shareMethod,
    share_platform: sharePlatform,
  });
}

/**
 * Track when someone clicks a referral link
 */
export async function trackReferralClick(referralCode: string, utmParams?: { utm_source?: string; utm_medium?: string; utm_campaign?: string }): Promise<void> {
  await api.post('/waitlist/track-click', {
    referral_code: referralCode,
    ...utmParams,
  });
}

/**
 * Get referral analytics for a user
 */
export async function getReferralAnalytics(email: string): Promise<ReferralAnalytics> {
  const response = await api.get<{ data: ReferralAnalytics }>(`/waitlist/referral-analytics?email=${encodeURIComponent(email)}`);
  return response.data;
}

/**
 * Waitlist API object (for backward compatibility)
 */
export const waitlistApi = {
  joinWaitlist,
  checkWaitlistStatus,
  unsubscribeFromWaitlist,
  getReferralLink,
  trackReferralShare,
  trackReferralClick,
  getReferralAnalytics,
};
