/**
 * Instagram API Service
 * Functions for Instagram connection and scanning
 */

import { api } from './client';

export interface Curator {
  id: number;
  name: string;
  username: string;
  profile_image: string;
  follower_count: number;
  category?: string;
}

export interface Product {
  id: number;
  name: string;
  image_url: string;
  brand: string;
}

export interface ScanResults {
  totalScanned: number;
  curatorsFound: number;
  curators: Curator[];
  products: Product[];
  timeElapsed: number;
}

/**
 * Scan Instagram followers for curators
 */
export async function scanInstagramFollowers(
  instagramAccessToken?: string
): Promise<ScanResults> {
  const response = await api.post<ScanResults>(
    '/instagram/scan',
    { instagram_access_token: instagramAccessToken },
    { requiresAuth: true }
  );
  return response;
}

/**
 * Get mock scan data (for testing without Instagram connection)
 */
export async function getMockScanData(): Promise<ScanResults> {
  const response = await api.get<ScanResults>(
    '/instagram/mock-scan',
    { requiresAuth: false }
  );
  return response;
}

/**
 * Auto-follow discovered curators
 */
export async function autoFollowCurators(
  curatorIds: number[]
): Promise<{ success: boolean; followedCount: number }> {
  const response = await api.post<{ success: boolean; followedCount: number }>(
    '/instagram/auto-follow',
    { curator_ids: curatorIds },
    { requiresAuth: true }
  );
  return response;
}
