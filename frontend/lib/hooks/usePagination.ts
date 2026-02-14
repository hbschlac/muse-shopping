/**
 * Custom hook for URL-based pagination state management
 * Persists pagination state in URL query parameters
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  paramName?: string;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

/**
 * Hook for managing pagination state in URL query parameters
 *
 * @example
 * const { page, setPage, nextPage, prevPage } = usePagination();
 *
 * // Use in API calls
 * const { data } = await searchProducts(query, filters, page, pageSize);
 *
 * // Update page
 * <Pagination currentPage={page} onPageChange={setPage} totalPages={totalPages} />
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    defaultPage = 1,
    defaultPageSize = 20,
    paramName = 'page',
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current page from URL or use default
  const page = useMemo(() => {
    const pageParam = searchParams.get(paramName);
    const parsed = pageParam ? parseInt(pageParam, 10) : defaultPage;
    return isNaN(parsed) || parsed < 1 ? defaultPage : parsed;
  }, [searchParams, paramName, defaultPage]);

  // Get page size from URL or use default
  const pageSize = useMemo(() => {
    const sizeParam = searchParams.get('pageSize');
    const parsed = sizeParam ? parseInt(sizeParam, 10) : defaultPageSize;
    return isNaN(parsed) || parsed < 1 ? defaultPageSize : parsed;
  }, [searchParams, defaultPageSize]);

  /**
   * Update URL with new query parameters
   */
  const updateURL = useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(newURL, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Set specific page number
   */
  const setPage = useCallback(
    (newPage: number) => {
      if (newPage < 1) return;
      updateURL({ [paramName]: newPage });
    },
    [updateURL, paramName]
  );

  /**
   * Set page size and reset to page 1
   */
  const setPageSize = useCallback(
    (newSize: number) => {
      if (newSize < 1) return;
      updateURL({ [paramName]: 1, pageSize: newSize });
    },
    [updateURL, paramName]
  );

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  /**
   * Go to previous page
   */
  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page, setPage]);

  /**
   * Reset to page 1
   */
  const resetPage = useCallback(() => {
    setPage(defaultPage);
  }, [setPage, defaultPage]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    resetPage,
  };
}

/**
 * Hook for infinite scroll pagination (offset-based)
 */
export interface UseInfiniteScrollOptions {
  defaultLimit?: number;
  defaultOffset?: number;
}

export interface UseInfiniteScrollReturn {
  offset: number;
  limit: number;
  loadMore: () => void;
  reset: () => void;
  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const { defaultLimit = 20, defaultOffset = 0 } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const offset = useMemo(() => {
    const offsetParam = searchParams.get('offset');
    const parsed = offsetParam ? parseInt(offsetParam, 10) : defaultOffset;
    return isNaN(parsed) || parsed < 0 ? defaultOffset : parsed;
  }, [searchParams, defaultOffset]);

  const limit = useMemo(() => {
    const limitParam = searchParams.get('limit');
    const parsed = limitParam ? parseInt(limitParam, 10) : defaultLimit;
    return isNaN(parsed) || parsed < 1 ? defaultLimit : parsed;
  }, [searchParams, defaultLimit]);

  const hasMoreParam = searchParams.get('hasMore');
  const hasMore = hasMoreParam !== 'false';

  const updateURL = useCallback(
    (newParams: Record<string, string | number | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const newURL = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(newURL, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const loadMore = useCallback(() => {
    updateURL({ offset: offset + limit, limit });
  }, [offset, limit, updateURL]);

  const reset = useCallback(() => {
    updateURL({ offset: defaultOffset, limit: defaultLimit, hasMore: null });
  }, [defaultOffset, defaultLimit, updateURL]);

  const setHasMore = useCallback(
    (hasMoreValue: boolean) => {
      updateURL({ hasMore: hasMoreValue });
    },
    [updateURL]
  );

  return {
    offset,
    limit,
    loadMore,
    reset,
    hasMore,
    setHasMore,
  };
}
