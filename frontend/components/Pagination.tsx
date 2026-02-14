/**
 * Muse Brand Pagination Component
 * Brand-compliant pagination with proper styling
 */

import React from 'react';
import { BrandTokens } from '@/lib/brand/tokens';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        pages.push(2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // In the middle
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className={`
          flex items-center justify-center
          h-10 px-4
          rounded-[12px]
          text-[${BrandTokens.typography.fontSize.body}]
          font-medium
          transition-all duration-[${BrandTokens.animation.duration.normal}]
          ${
            currentPage === 1
              ? 'bg-[#E5E5E5] text-[#9A9A9A] cursor-not-allowed'
              : 'bg-white text-[[var(--color-text-primary)]] hover:bg-[[var(--bg-cream)]] active:scale-95'
          }
        `}
        aria-label="Previous page"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Prev
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center w-10 h-10 text-[#6B6B6B]"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`
                flex items-center justify-center
                w-10 h-10
                rounded-[12px]
                text-[${BrandTokens.typography.fontSize.body}]
                font-medium
                transition-all duration-[${BrandTokens.animation.duration.normal}]
                ${
                  isActive
                    ? 'bg-[[var(--color-text-primary)]] text-white'
                    : 'bg-white text-[[var(--color-text-primary)]] hover:bg-[[var(--bg-cream)]] active:scale-95'
                }
              `}
              aria-label={`Go to page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={`
          flex items-center justify-center
          h-10 px-4
          rounded-[12px]
          text-[${BrandTokens.typography.fontSize.body}]
          font-medium
          transition-all duration-[${BrandTokens.animation.duration.normal}]
          ${
            currentPage === totalPages
              ? 'bg-[#E5E5E5] text-[#9A9A9A] cursor-not-allowed'
              : 'bg-white text-[[var(--color-text-primary)]] hover:bg-[[var(--bg-cream)]] active:scale-95'
          }
        `}
        aria-label="Next page"
      >
        Next
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="ml-1"
        >
          <path
            d="M7.5 15L12.5 10L7.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Simple Load More Button Component
 * For infinite scroll patterns
 */
export interface LoadMoreButtonProps {
  onLoadMore: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onLoadMore,
  loading = false,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      onClick={onLoadMore}
      disabled={disabled || loading}
      className={`
        flex items-center justify-center
        h-[56px] px-6
        rounded-[12px]
        bg-white
        text-[${BrandTokens.typography.fontSize.body}]
        font-medium
        text-[[var(--color-text-primary)]]
        transition-all duration-[${BrandTokens.animation.duration.normal}]
        shadow-[${BrandTokens.shadows.base}]
        ${
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-[[var(--bg-cream)]] active:scale-95'
        }
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </>
      ) : (
        'Load More'
      )}
    </button>
  );
};

/**
 * Loading Spinner Component
 * Brand-compliant loading state
 */
export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className="animate-spin h-8 w-8 text-[[var(--color-text-primary)]]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};
