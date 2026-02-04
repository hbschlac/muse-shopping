/**
 * React hook for fetching newsfeed data
 */

import { useState, useEffect } from 'react';
import { getNewsfeed } from '../api/newsfeed';
import type { NewsfeedResponse } from '../types/api';

interface UseNewsfeedOptions {
  userId?: string;
  enabled?: boolean;
}

export function useNewsfeed(options: UseNewsfeedOptions = {}) {
  const { userId, enabled = true } = options;

  const [data, setData] = useState<NewsfeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function fetchNewsfeed() {
      try {
        setLoading(true);
        setError(null);
        const response = await getNewsfeed(userId);

        if (!cancelled) {
          setData(response);
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
  }, [userId, enabled]);

  return { data, loading, error, refetch: () => setLoading(true) };
}
