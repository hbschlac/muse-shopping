'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import ProductTile from '@/components/ProductTile';
import BrandLogo from '@/components/BrandLogo';
import BottomNav from '@/components/BottomNav';

export default function BrandPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [brand, setBrand] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadBrandAndItems();
  }, [slug]);

  const loadBrandAndItems = async () => {
    setLoading(true);
    try {
      const brandRes = await fetch(`/api/v1/brands/slug/${slug}`);
      if (!brandRes.ok) {
        setBrand(null);
        setLoading(false);
        return;
      }
      const brandData = await brandRes.json();
      const brandObj = brandData.data?.brand || brandData.brand;
      setBrand(brandObj);

      const itemsRes = await fetch(`/api/v1/items?brands=${brandObj.id}&limit=50`);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.data?.items || []);
      }

      // Check if user follows this brand
      const token = localStorage.getItem('auth_token');
      if (token) {
        const followRes = await fetch('/api/v1/brands/following/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (followRes.ok) {
          const followData = await followRes.json();
          const followed = (followData.data?.brands || []).some(
            (b: any) => b.id === brandObj.id
          );
          setIsFollowing(followed);
        }
      }
    } catch (err) {
      console.error('Error loading brand page:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/welcome');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/v1/brands/follow/${brand.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFollowing(false);
      } else {
        await fetch('/api/v1/brands/follow', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ brand_id: brand.id }),
        });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="animate-pulse p-4">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3" />
          <div className="h-24 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand not found</h2>
          <p className="text-gray-500 mb-6">We couldn't find this brand.</p>
          <button
            onClick={() => router.back()}
            className="w-full py-3 bg-gray-900 text-white rounded-[12px] font-medium hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-20 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </button>
        <button
          onClick={handleFollow}
          disabled={followLoading}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            isFollowing
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'gradient-primary text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Brand Header */}
      <div className="pt-20 px-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-3">
          <BrandLogo
            brandName={brand.name}
            logoUrl={brand.logo_url}
            size="lg"
            showName={false}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
            {brand.followers !== undefined && (
              <p className="text-sm text-gray-500">{brand.followers.toLocaleString()} followers</p>
            )}
          </div>
        </div>
        {brand.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{brand.description}</p>
        )}
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-[var(--color-coral)] hover:underline"
          >
            Visit website →
          </a>
        )}
      </div>

      {/* Products Grid */}
      <div className="px-4 pt-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {items.length > 0 ? `${items.length} Products` : 'Products'}
        </h2>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-sm">No products available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item: any) => (
              <Link key={item.id} href={`/product/${item.id}`} className="group">
                <div className="aspect-[3/4] bg-gray-100 rounded-[12px] overflow-hidden mb-2 shadow-subtle group-hover:shadow-base transition-shadow">
                  {item.primary_image_url || item.image_url ? (
                    <img
                      src={item.primary_image_url || item.image_url}
                      alt={item.canonical_name || item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.canonical_name || item.name}
                </p>
                {item.best_price != null && (
                  <p className="text-sm font-semibold text-gray-700">
                    ${Number(item.best_price).toFixed(2)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
