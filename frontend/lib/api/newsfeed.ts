/**
 * Newsfeed API Service
 */

import { api } from './client';
import type { NewsfeedResponse, Story, BrandModule } from '../types/api';

/**
 * Get newsfeed content (hero campaigns, stories, brand modules)
 */
export async function getNewsfeed(userId?: string): Promise<NewsfeedResponse> {
  const endpoint = userId ? `/newsfeed?user_id=${userId}` : '/newsfeed';
  return api.get<NewsfeedResponse>(endpoint, { requiresAuth: !!userId });
}

/**
 * Get stories
 */
export async function getStories(): Promise<Story[]> {
  return api.get<Story[]>('/newsfeed/stories');
}

/**
 * Get brand modules for a specific user
 */
export async function getBrandModules(userId: string): Promise<BrandModule[]> {
  return api.get<BrandModule[]>(`/newsfeed/modules?user_id=${userId}`, {
    requiresAuth: true,
  });
}

/**
 * Track story view analytics
 */
export async function trackStoryView(storyId: string): Promise<void> {
  await api.post(
    '/newsfeed/stories/view',
    { story_id: storyId },
    { requiresAuth: true }
  );
}

/**
 * Track brand module interaction
 */
export async function trackModuleInteraction(
  moduleId: string,
  action: 'view' | 'click' | 'scroll'
): Promise<void> {
  await api.post(
    '/newsfeed/modules/analytics',
    { module_id: moduleId, action },
    { requiresAuth: true }
  );
}
