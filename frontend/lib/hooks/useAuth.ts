/**
 * React hook for authentication state
 */

import { useState, useEffect } from 'react';
import { getCurrentUser } from '../api/auth';
import type { User } from '../types/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        // Check if auth token exists
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('auth_token')
          : null;

        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        const userData = await getCurrentUser();

        if (!cancelled) {
          setUser(userData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch user'));
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
  };
}
