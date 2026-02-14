/**
 * React hook for fetching newsfeed data with infinite scroll
 */

import { useState, useEffect, useCallback } from 'react';
import { getNewsfeed } from '../api/newsfeed';
import type { NewsfeedResponse, BrandModule } from '../types/api';

interface UseNewsfeedOptions {
  userId?: string;
  enabled?: boolean;
  initialLimit?: number;
}

export function useNewsfeed(options: UseNewsfeedOptions = {}) {
  const { userId, enabled = true, initialLimit = 5 } = options;

  const [data, setData] = useState<NewsfeedResponse | null>(null);
  const [allModules, setAllModules] = useState<BrandModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Initial fetch
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function fetchNewsfeed() {
      try {
        setLoading(true);
        setError(null);
        const response = await getNewsfeed(userId, initialLimit, 0);

        if (!cancelled) {
          setData(response);
          setAllModules(response.brand_modules || []);
          setOffset(initialLimit);
          setHasMore((response.brand_modules?.length || 0) >= initialLimit);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch newsfeed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchNewsfeed();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled, initialLimit]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const response = await getNewsfeed(userId, initialLimit, offset);

      const newModules = response.brand_modules || [];
      setAllModules((prev) => [...prev, ...newModules]);
      setOffset((prev) => prev + initialLimit);
      setHasMore(newModules.length >= initialLimit);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, offset, loadingMore, hasMore, initialLimit]);

  return {
    data,
    allModules,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch: () => {
      setOffset(0);
      setLoading(true);
    },
  };
}
