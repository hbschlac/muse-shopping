import { api } from './client';
import type { CampaignDetails } from '../types/api';

/**
 * Get campaign details including all items
 */
export async function getCampaignDetails(campaignId: string): Promise<CampaignDetails> {
  const response = await api.get<{ success: boolean; data: CampaignDetails }>(`/campaigns/${campaignId}`);
  return response.data;
}

/**
 * Track campaign impression
 */
export async function trackCampaignImpression(campaignId: string): Promise<void> {
  await api.post(`/campaigns/${campaignId}/impressions`);
}

/**
 * Track campaign click
 */
export async function trackCampaignClick(
  campaignId: string,
  clickType: 'hero_cta' | 'item_card' | 'view_all'
): Promise<void> {
  await api.post(`/campaigns/${campaignId}/clicks`, { click_type: clickType });
}

/**
 * Track campaign conversion
 */
export async function trackCampaignConversion(
  campaignId: string,
  itemId: string,
  conversionType: 'add_to_cart' | 'favorite' | 'purchase'
): Promise<void> {
  await api.post(`/campaigns/${campaignId}/conversions`, {
    item_id: itemId,
    conversion_type: conversionType,
  });
}
