'use client';

import { useState, useEffect } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { getProductReviews, markReviewHelpful } from '@/lib/api/products';
import { getDemoReviews } from '@/lib/demoData';

interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  helpful_count: number;
  created_at: string;
  source_retailer: string | null;
  source_url: string | null;
  reviewer_name: string;
}

interface ReviewSummary {
  total_reviews: number;
  rating: number;
  count_5: number;
  count_4: number;
  count_3: number;
  count_2: number;
  count_1: number;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [helpfulMarked, setHelpfulMarked] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getProductReviews(productId, 5, 0, 'newest');
      setSummary(data.summary);
      setReviews(data.reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Try demo data as fallback
      const demoData = getDemoReviews(productId);
      setSummary(demoData.summary);
      setReviews(demoData.reviews);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId: number) => {
    if (helpfulMarked.has(reviewId)) return;

    try {
      await markReviewHelpful(productId, reviewId);
      setHelpfulMarked(new Set(helpfulMarked).add(reviewId));
      // Update the helpful count locally
      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
      ));
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingBar = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-24 bg-gray-200 rounded mb-4" />
        </div>
      </div>
    );
  }

  if (!summary || summary.total_reviews === 0) {
    return (
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Reviews
        </h3>
        <p className="text-gray-500">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="p-6 border-t border-gray-200">
      {/* Summary Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Reviews
        </h3>

        <div className="flex items-start gap-6 mb-4">
          {/* Overall Rating */}
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {summary.rating.toFixed(1)}
            </div>
            {renderStars(Math.round(summary.rating), 'lg')}
            <div className="text-sm text-gray-500 mt-1">
              {summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-gray-700">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                {renderRatingBar(
                  summary[`count_${rating}` as keyof ReviewSummary] as number,
                  summary.total_reviews
                )}
                <span className="text-gray-500 w-8 text-right">
                  {summary[`count_${rating}` as keyof ReviewSummary]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.slice(0, expanded ? reviews.length : 3).map((review) => (
          <div key={review.id} className="border-t border-gray-200 pt-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                {renderStars(review.rating, 'sm')}
                <div className="text-sm font-medium text-gray-900 mt-1">
                  {review.reviewer_name}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {review.source_retailer && (
                <div className="text-xs text-gray-500">
                  via {review.source_retailer}
                </div>
              )}
            </div>

            {review.title && (
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                {review.title}
              </h4>
            )}

            <p className="text-sm text-gray-700 mb-3">{review.body}</p>

            <button
              onClick={() => handleMarkHelpful(review.id)}
              disabled={helpfulMarked.has(review.id)}
              className={`flex items-center gap-1.5 text-xs ${
                helpfulMarked.has(review.id)
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ThumbsUp
                className={`w-3.5 h-3.5 ${
                  helpfulMarked.has(review.id) ? 'fill-gray-400' : ''
                }`}
              />
              Helpful ({review.helpful_count})
            </button>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {reviews.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors"
        >
          {expanded ? 'Show Less' : `Show All ${summary.total_reviews} Reviews`}
        </button>
      )}
    </div>
  );
}
