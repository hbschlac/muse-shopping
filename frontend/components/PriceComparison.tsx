'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Check } from 'lucide-react';
import { getProductListings } from '@/lib/api/products';
import BrandLogo from './BrandLogo';
import { getDemoProduct } from '@/lib/demoData';

interface Listing {
  id: number;
  retailer_id: number;
  retailer_name: string;
  retailer_logo: string | null;
  product_url: string;
  affiliate_url: string | null;
  price: number;
  sale_price: number | null;
  currency: string;
  in_stock: boolean;
  sizes_available: string[] | null;
  colors_available: string[] | null;
  last_scraped_at: string;
}

interface PriceComparisonProps {
  productId: string;
}

export default function PriceComparison({ productId }: PriceComparisonProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadListings();
  }, [productId]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getProductListings(productId);
      setListings(data.listings || []);
    } catch (error) {
      console.error('Error loading price listings:', error);
      // Try demo data as fallback
      const demoProduct = getDemoProduct(productId);
      setListings(demoProduct?.listings || []);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, salePrice: number | null) => {
    // Ensure price values are numbers
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    const salePriceNum = salePrice ? (typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice) : null;

    const currentPrice = salePriceNum ?? priceNum;
    const hasDiscount = salePriceNum && salePriceNum < priceNum;

    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-900">
          ${currentPrice.toFixed(2)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-sm text-gray-500 line-through">
              ${priceNum.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
              {Math.round(((priceNum - currentPrice) / priceNum) * 100)}% off
            </span>
          </>
        )}
      </div>
    );
  };

  const handleRetailerClick = (listing: Listing) => {
    // Use affiliate URL if available, otherwise use product URL
    const url = listing.affiliate_url || listing.product_url;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return null;
  }

  const visibleListings = expanded ? listings : listings.slice(0, 3);
  const bestPrice = Math.min(
    ...listings.map((l) => {
      const price = typeof l.price === 'string' ? parseFloat(l.price) : l.price;
      const salePrice = l.sale_price ? (typeof l.sale_price === 'string' ? parseFloat(l.sale_price) : l.sale_price) : null;
      return salePrice ?? price;
    })
  );

  return (
    <div className="p-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Where to Buy ({listings.length} {listings.length === 1 ? 'Store' : 'Stores'})
      </h3>

      <div className="space-y-3">
        {visibleListings.map((listing, index) => {
          const price = typeof listing.price === 'string' ? parseFloat(listing.price) : listing.price;
          const salePrice = listing.sale_price ? (typeof listing.sale_price === 'string' ? parseFloat(listing.sale_price) : listing.sale_price) : null;
          const currentPrice = salePrice ?? price;
          const isBestPrice = currentPrice === bestPrice && listings.length > 1;

          return (
            <div
              key={listing.id}
              className={`relative border rounded-[12px] p-4 transition-all duration-150 ${
                !listing.in_stock
                  ? 'bg-gray-50 border-gray-200'
                  : isBestPrice
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {isBestPrice && (
                <div className="absolute -top-2 left-4 bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  BEST PRICE
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                {/* Retailer Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center">
                    <BrandLogo
                      brandName={listing.retailer_name}
                      fallbackUrl={listing.retailer_logo}
                      alt={listing.retailer_name}
                      className="w-full h-full object-contain"
                      showFallbackGradient={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {listing.retailer_name}
                    </div>
                    {formatPrice(listing.price, listing.sale_price)}
                  </div>
                </div>

                {/* Stock & Action */}
                <div className="flex flex-col items-end gap-2">
                  {listing.in_stock ? (
                    <>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="w-3 h-3" />
                        <span className="font-medium">In Stock</span>
                      </div>
                      <button
                        onClick={() => handleRetailerClick(listing)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-[8px] hover:bg-gray-800 transition-colors"
                      >
                        Shop Now
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium">
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {listing.in_stock && (listing.sizes_available || listing.colors_available) && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  {listing.sizes_available && listing.sizes_available.length > 0 && (
                    <div>
                      Sizes: {listing.sizes_available.slice(0, 5).join(', ')}
                      {listing.sizes_available.length > 5 && '...'}
                    </div>
                  )}
                  {listing.colors_available && listing.colors_available.length > 0 && (
                    <div>
                      Colors: {listing.colors_available.slice(0, 3).join(', ')}
                      {listing.colors_available.length > 3 && '...'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {listings.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors"
        >
          {expanded ? 'Show Less' : `Show All ${listings.length} Stores`}
        </button>
      )}

      {/* Last Updated */}
      {listings.length > 0 && listings[0].last_scraped_at && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Prices last updated:{' '}
          {new Date(listings[0].last_scraped_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}
