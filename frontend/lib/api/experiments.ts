/**
 * Experiments API Service
 */

import { api } from './client';

export interface ExperimentAssignment {
  experiment_id: string | number | null;
  experiment_name?: string;
  variant_id?: string | number | null;
  variant: string;
  params: Record<string, any>;
}

export interface ExperimentContext {
  page_type?: string;
  placement?: string;
  locale?: string;
}

export async function assignExperiment(payload: {
  user_id?: string | null;
  session_id?: string | null;
  context?: ExperimentContext;
}): Promise<ExperimentAssignment> {
  return api.post<ExperimentAssignment>('/experiments/assign', payload);
}

export async function trackExperimentImpression(payload: {
  user_id?: string | null;
  session_id?: string | null;
  experiment_id?: string | null;
  variant_id?: string | null;
  item_id?: string;
  brand_id?: string;
  position?: number;
  placement?: string;
  page_type?: string;
}): Promise<{ success: boolean }> {
  return api.post('/experiments/track-impression', payload);
}

export async function trackExperimentClick(payload: {
  user_id?: string | null;
  session_id?: string | null;
  experiment_id?: string | null;
  variant_id?: string | null;
  item_id?: string;
  brand_id?: string;
  position?: number;
  placement?: string;
  page_type?: string;
}): Promise<{ success: boolean }> {
  return api.post('/experiments/track-click', payload);
}

// ============================================================================
// Instagram Module Experiment Tracking
// ============================================================================

/**
 * Track module impression for A/B testing
 */
export async function trackModuleImpression(
  moduleId: number,
  experimentData?: {
    experiment_id: number;
    variant_id: number;
    in_experiment: boolean;
  },
  position?: number
): Promise<void> {
  if (!experimentData || !experimentData.in_experiment) {
    return; // Only track if module is in an active experiment
  }

  try {
    await api.post('/experiments/modules/track', {
      event_type: 'module_impression',
      module_id: moduleId,
      variant_id: experimentData.variant_id,
      experiment_id: experimentData.experiment_id,
      position,
    });
  } catch (error) {
    console.error('Error tracking module impression:', error);
  }
}

/**
 * Track product click within module
 */
export async function trackModuleProductClick(
  moduleId: number,
  productId: number | string,
  experimentData?: {
    experiment_id: number;
    variant_id: number;
    in_experiment: boolean;
  }
): Promise<void> {
  if (!experimentData || !experimentData.in_experiment) {
    return;
  }

  try {
    await api.post('/experiments/modules/track', {
      event_type: 'item_click',
      module_id: moduleId,
      item_id: productId,
      variant_id: experimentData.variant_id,
      experiment_id: experimentData.experiment_id,
    });
  } catch (error) {
    console.error('Error tracking module product click:', error);
  }
}

/**
 * Track module swipe/scroll
 */
export async function trackModuleSwipe(
  moduleId: number,
  experimentData?: {
    experiment_id: number;
    variant_id: number;
    in_experiment: boolean;
  }
): Promise<void> {
  if (!experimentData || !experimentData.in_experiment) {
    return;
  }

  try {
    await api.post('/experiments/modules/track', {
      event_type: 'module_swipe',
      module_id: moduleId,
      variant_id: experimentData.variant_id,
      experiment_id: experimentData.experiment_id,
    });
  } catch (error) {
    console.error('Error tracking module swipe:', error);
  }
}

/**
 * Get module performance metrics (for admin dashboard)
 */
export async function getModulePerformanceMetrics(
  moduleId: number,
  days: number = 7
): Promise<any> {
  return api.get(`/experiments/modules/${moduleId}/metrics?days=${days}`);
}

/**
 * Get real-time module stats
 */
export async function getModuleRealtimeStats(
  moduleId: number,
  variantId?: number
): Promise<any> {
  const url = variantId
    ? `/experiments/modules/${moduleId}/realtime?variant_id=${variantId}`
    : `/experiments/modules/${moduleId}/realtime`;

  return api.get(url);
}
