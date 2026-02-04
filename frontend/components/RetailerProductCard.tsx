'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getRetailerCheckoutLink,
  trackProductInteraction,
  type RetailerProduct,
} from '@/lib/api/retailers';

interface RetailerProductCardProps {
  product: RetailerProduct;
  onSave?: (productId: string) => void;
  isSaved?: boolean;
}

/**
 * Product Card for Retailer Products
 * Displays product from Target, Walmart, or Nordstrom
 */
export default function RetailerProductCard({
  product,
  onSave,
  isSaved = false,
}: RetailerProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      // Track click interaction
      await trackProductInteraction(product.product_id, 'click');
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);

      // Get affiliate checkout link
      const { checkout_url } = await getRetailerCheckoutLink(product.product_id);

      // Open in new tab
      window.open(checkout_url, '_blank');
    } catch (err) {
      console.error('Failed to get checkout link:', err);
      alert('Failed to open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onSave) {
      onSave(product.product_id);
    }
  };

  const discountPercent =
    product.original_price && product.price < product.original_price
      ? Math.round(
          ((product.original_price - product.price) / product.original_price) * 100
        )
      : null;

  return (
    <Link
      href={`/product/${product.product_id}`}
      onClick={handleClick}
      className="group block bg-white rounded-[12px] overflow-hidden shadow-subtle hover:shadow-base transition-all duration-150"
    >
      {/* Product Image */}
      <div className="relative aspect-[3/4] bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* Discount Badge */}
        {discountPercent && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
            {discountPercent}% OFF
          </div>
        )}

        {/* Save Button */}
        {onSave && (
          <button
            onClick={handleSave}
            className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
            aria-label={isSaved ? 'Unsave product' : 'Save product'}
          >
            <svg
              className={`w-5 h-5 ${
                isSaved ? 'text-red-500 fill-current' : 'text-gray-600'
              }`}
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}

        {/* Stock Status */}
        {!product.in_stock && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-gray-900/80 text-white text-xs font-medium rounded">
            Out of Stock
          </div>
        )}

        {/* Free Shipping Badge */}
        {product.shipping_info?.free_shipping && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
            Free Shipping
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        {/* Retailer Name */}
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {product.retailer_name}
        </p>

        {/* Product Name */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-semibold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-sm text-gray-500 line-through">
              ${product.original_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Promotions */}
        {product.promotions && product.promotions.length > 0 && (
          <div className="mb-2">
            {product.promotions.slice(0, 1).map((promo, index) => (
              <p key={index} className="text-xs text-green-600 font-medium">
                {promo.description}
              </p>
            ))}
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading || !product.in_stock}
          className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Loading...'
            : !product.in_stock
            ? 'Out of Stock'
            : 'Buy Now'}
        </button>

        {/* Estimated Delivery */}
        {product.shipping_info?.estimated_delivery && product.in_stock && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Est. delivery: {product.shipping_info.estimated_delivery}
          </p>
        )}
      </div>
    </Link>
  );
}
