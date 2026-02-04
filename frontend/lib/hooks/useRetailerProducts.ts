/**
 * React hook for fetching retailer products
 */

import { useState, useEffect } from 'react';
import {
  searchRetailerProducts,
  type RetailerProduct,
  type RetailerSearchParams,
} from '../api/retailers';

interface UseRetailerProductsOptions extends RetailerSearchParams {
  retailerId: string;
  enabled?: boolean;
}

export function useRetailerProducts(options: UseRetailerProductsOptions) {
  const { retailerId, enabled = true, ...searchParams } = options;

  const [data, setData] = useState<{
    products: RetailerProduct[];
    total: number;
    page: number;
    has_more: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !retailerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        const response = await searchRetailerProducts(retailerId, searchParams);

        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error('Failed to fetch products')
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [
    retailerId,
    enabled,
    searchParams.query,
    searchParams.category,
    searchParams.brand,
    searchParams.price_min,
    searchParams.price_max,
    searchParams.page,
    searchParams.limit,
  ]);

  const refetch = () => setLoading(true);

  return { data, loading, error, refetch };
}
