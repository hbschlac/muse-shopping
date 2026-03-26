'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Share2, ShoppingCart, X, Sparkles } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import ProductReviews from '@/components/ProductReviews';
import BrandLogo from '@/components/BrandLogo';
import SimilarItems from '@/components/SimilarItems';
import { getDemoProduct } from '@/lib/demoData';
import { getCart } from '@/lib/api/cart';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';

interface ProductDetails {
  id: number;
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  brand_logo: string | null;
  brand_website: string | null;
  canonical_name: string;
  description: string;
  category: string;
  subcategory: string | null;
  gender: string | null;
  primary_image_url: string;
  additional_images: string[] | null;
  listings: any[];
  attributes: any;
  best_price: number | null;
  listing_count: number;
  is_favorited?: boolean;
}

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [styleItems, setStyleItems] = useState<any[]>([]);

  const { trackProductView, trackAddToCart, trackPageView } = useActivityTracking();

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadCartStatus();
    }
  }, [productId]);

  // Update meta tags for sharing when product loads
  useEffect(() => {
    if (product) {
      updateMetaTags();
      // Track product view
      trackProductView(product.id, product.brand_id);
    }
  }, [product, trackProductView]);

  const updateMetaTags = () => {
    if (!product) return;

    const title = `${product.brand_name} - ${product.canonical_name}`;
    const description = `${product.canonical_name} on Muse - Buy from all your favorite places with just one checkout`;
    const image = product.primary_image_url;
    const url = window.location.href;

    // Update document title
    document.title = title;

    // Update or create meta tags
    const metaTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'product' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'description', content: description },
    ];

    metaTags.forEach(({ property, name, content }) => {
      const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
      let tag = document.querySelector(selector);

      if (!tag) {
        tag = document.createElement('meta');
        if (property) tag.setAttribute('property', property);
        if (name) tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    });
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/v1/items/${productId}`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Try demo data as fallback
        const demoProduct = getDemoProduct(productId);
        if (demoProduct) {
          setProduct(demoProduct);
          setIsSaved(false);
          return;
        }
        throw new Error(data.error?.message || 'Failed to load product');
      }

      if (data.success && data.data) {
        setProduct(data.data);
        setIsSaved(data.data.is_favorited || false);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      // Try demo data as final fallback
      const demoProduct = getDemoProduct(productId);
      if (demoProduct) {
        setProduct(demoProduct);
        setIsSaved(false);
      } else {
        setProduct(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Please sign in to save items to your favorites');
      return;
    }

    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/v1/items/${productId}/favorite`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        alert('Your session has expired. Please sign in again.');
        return;
      }

      if (response.ok) {
        setIsSaved(!isSaved);
      } else {
        const errorData = await response.json();
        console.error('Failed to toggle favorite:', errorData);
        alert('Failed to update favorites. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  const loadCartStatus = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) return;

      const cartData: any = await getCart();

      // Cart is grouped by stores, so we need to search through all stores
      let totalQuantity = 0;
      if (cartData.stores) {
        for (const store of cartData.stores) {
          for (const item of store.items) {
            if (item.itemId === parseInt(productId)) {
              totalQuantity += item.quantity;
            }
          }
        }
      }

      setCartQuantity(totalQuantity);
    } catch (error) {
      console.error('Error loading cart status:', error);
      setCartQuantity(0);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/welcome');
      return;
    }

    if (!product || !product.listings || product.listings.length === 0) {
      alert('No listings available for this product');
      return;
    }

    const listing = product.listings[0];

    // Get all available sizes and colors
    const availableSizes = Array.from(
      new Set(
        product.listings.flatMap((l) => l.sizes_available || []).filter(Boolean)
      )
    );
    const availableColors = Array.from(
      new Set(
        product.listings.flatMap((l) => l.colors_available || []).filter(Boolean)
      )
    );

    // Validate variant selection if variants are available
    if (availableSizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }
    if (availableColors.length > 0 && !selectedColor) {
      alert('Please select a color');
      return;
    }

    try {
      setAddingToCart(true);

      const cartItemData = {
        storeId: listing.retailer_id,
        brandId: product.brand_id,
        productName: product.canonical_name,
        productSku: listing.retailer_product_id || `item-${product.id}`,
        productUrl: listing.product_url,
        productImageUrl: product.primary_image_url,
        productDescription: product.description || null,
        priceCents: Math.round((listing.sale_price || listing.price) * 100),
        originalPriceCents: listing.price ? Math.round(listing.price * 100) : null,
        size: selectedSize || null,
        color: selectedColor || null,
        quantity: 1,
        inStock: listing.in_stock,
        currency: listing.currency || 'USD',
        metadata: {
          itemId: product.id,
        },
      };

      const response = await fetch('/api/v1/cart/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartItemData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to add to cart');
      }

      trackAddToCart(product.id, product.brand_id, cartItemData.priceCents);

      await loadCartStatus();
    } catch (error: any) {
      console.error('Error adding to cart:', error);

      if (error?.status === 401 || error?.message?.includes('401')) {
        localStorage.removeItem('auth_token');
        router.push('/welcome');
        return;
      }

      alert(error.message || 'Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/chat');
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: `${product.brand_name} - ${product.canonical_name}`,
          text: `${product.canonical_name} on Muse - Buy from all your favorite places with just one checkout`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (totalImages: number) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const loadStyleItems = async () => {
    if (!product) return;

    try {
      // Get complementary items based on product category
      const authToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Fetch similar/complementary items
      const response = await fetch(
        `/api/v1/items/${productId}/style-with?limit=3`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setStyleItems(data.data?.items || data.items || []);
      } else {
        // Fallback: use demo data or similar items
        setStyleItems([]);
      }
    } catch (error) {
      console.error('Error loading style items:', error);
      setStyleItems([]);
    }
  };

  const handleOpenStyleModal = () => {
    setShowStyleModal(true);
    if (styleItems.length === 0) {
      loadStyleItems();
    }
  };

  // Extract all available sizes and colors from listings (must be before early returns — Rules of Hooks)
  const availableSizes = product
    ? Array.from(
        new Set(
          product.listings.flatMap((l) => l.sizes_available || []).filter(Boolean)
        )
      )
    : [];
  const availableColors = product
    ? Array.from(
        new Set(
          product.listings.flatMap((l) => l.colors_available || []).filter(Boolean)
        )
      )
    : [];

  // Auto-select first variant if only one option (must be before early returns — Rules of Hooks)
  useEffect(() => {
    if (availableSizes.length === 1 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
    if (availableColors.length === 1 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableSizes.join(','), availableColors.join(','), selectedSize, selectedColor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="animate-pulse p-4">
          <div className="h-8 bg-gray-200 rounded mb-4" />
          <div className="aspect-[3/4] bg-gray-200 rounded mb-4" />
          <div className="h-6 bg-gray-200 rounded mb-2" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-500 mb-6">
            Unable to load product details. Please try again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full py-3 bg-gray-900 text-white rounded-[12px] font-medium hover:bg-gray-800 transition-colors"
            >
              Go Back
            </button>
            <Link
              href="/home"
              className="block w-full py-3 border border-gray-300 text-gray-900 rounded-[12px] font-medium hover:bg-gray-50 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allImages = [
    product.primary_image_url,
    ...(product.additional_images || []),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-20 px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors duration-150"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors duration-150"
          >
            <Share2 className="w-5 h-5 text-gray-900" />
          </button>
          <button
            onClick={handleToggleFavorite}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors duration-150"
          >
            <Heart
              className={`w-5 h-5 ${
                isSaved ? 'fill-[var(--color-coral)] text-[var(--color-coral)]' : 'text-gray-900'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="pt-16">
        <div
          className="aspect-[3/4] bg-gray-100 relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => onTouchEnd(allImages.length)}
        >
          {allImages[currentImageIndex] ? (
            <img
              src={allImages[currentImageIndex]}
              alt={product.canonical_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No Image Available
            </div>
          )}

          {/* Navigation Arrows for Desktop */}
          {allImages.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg items-center justify-center hover:bg-white transition-all duration-150 z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-900" />
                </button>
              )}
              {currentImageIndex < allImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg items-center justify-center hover:bg-white transition-all duration-150 z-10"
                  aria-label="Next image"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-900 rotate-180" />
                </button>
              )}
            </>
          )}

          {/* Image Indicators */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-150 ${
                    index === currentImageIndex
                      ? 'bg-white w-6'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* How to Style Button */}
          <button
            onClick={handleOpenStyleModal}
            className="absolute top-4 left-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center gap-2 hover:bg-white transition-all duration-150 z-10"
          >
            <Sparkles className="w-4 h-4 text-gray-900" />
            <span className="text-sm font-semibold text-gray-900">How to Style</span>
          </button>
        </div>
      </div>

      {/* Style Modal */}
      {showStyleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-[24px] md:rounded-[24px] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gray-900" />
                <h2 className="text-xl font-semibold text-gray-900">Complete the Look</h2>
              </div>
              <button
                onClick={() => setShowStyleModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors duration-150"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {styleItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {styleItems.map((item, index) => (
                    <Link
                      key={item.id || index}
                      href={`/product/${item.id}`}
                      onClick={() => setShowStyleModal(false)}
                      className="group"
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2">
                        <img
                          src={item.primary_image_url || item.image_url}
                          alt={item.canonical_name || item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <p className="text-xs text-gray-600 font-medium mb-1 line-clamp-1">
                        {item.brand_name}
                      </p>
                      <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-1">
                        {item.canonical_name || item.name}
                      </p>
                      {item.best_price && (
                        <p className="text-sm font-semibold text-gray-900">
                          ${item.best_price.toFixed(2)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Loading styling suggestions...</p>
                  <p className="text-sm text-gray-500">
                    We're finding the perfect pieces to complete this look
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowStyleModal(false)}
                className="w-full h-12 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors duration-150"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Info */}
      <div className="p-6">
        {/* Brand */}
        <Link
          href={`/brands/${product.brand_slug}`}
          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          {product.brand_logo && (
            <BrandLogo
              brandName={product.brand_name}
              fallbackUrl={product.brand_logo}
              alt={product.brand_name}
              className="w-8 h-8 object-contain"
              showFallbackGradient={false}
            />
          )}
          <span className="text-lg text-gray-600 font-medium">{product.brand_name}</span>
        </Link>

        {/* Product Name */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          {product.canonical_name}
        </h1>

        {/* Price */}
        {product.best_price && (
          <p className="text-2xl font-semibold text-gray-900 mb-4">
            ${product.best_price.toFixed(2)}
          </p>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-base text-gray-600 mb-6">
            {product.description}
          </p>
        )}

        {/* Category & Gender */}
        <div className="flex items-center gap-2 mb-6">
          {product.category && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {product.category}
            </span>
          )}
          {product.subcategory && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {product.subcategory}
            </span>
          )}
          {product.gender && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {product.gender}
            </span>
          )}
        </div>

        {/* Size Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
          <div className="flex flex-wrap gap-2">
            {availableSizes.length > 0 ? (
              availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-150 ${
                    selectedSize === size
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {size}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 border border-gray-300 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium">
                One Size
              </div>
            )}
          </div>
        </div>

        {/* Color Selector */}
        {availableColors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Color</h3>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-150 ${
                    selectedColor === color
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Similar Items Carousel */}
      <SimilarItems productId={productId} limit={16} />

      {/* Reviews Module */}
      <ProductReviews productId={productId} />

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        {cartQuantity > 0 ? (
          <Link
            href="/cart"
            className="w-full h-14 bg-gray-900 text-white rounded-[24px] font-semibold flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-5 h-5" />
            In Cart ({cartQuantity})
          </Link>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="w-full h-14 bg-gray-900 text-white rounded-[24px] font-semibold flex items-center justify-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
}
