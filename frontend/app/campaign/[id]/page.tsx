'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Heart, Sparkles } from 'lucide-react';
import { getCampaignDetails } from '@/lib/api/campaigns';
import { getDemoCampaign } from '@/lib/demoData';
import type { CampaignDetails, CampaignItem } from '@/lib/types/api';

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    async function loadCampaign() {
      try {
        setLoading(true);

        // Try to get campaign from API first
        try {
          const data = await getCampaignDetails(campaignId);
          setCampaign(data);
        } catch (apiError) {
          // Fall back to demo data
          const demoData = getDemoCampaign(campaignId);
          if (demoData) {
            setCampaign({
              id: demoData.id,
              title: demoData.title,
              subtitle: demoData.subtitle,
              gradient: demoData.gradient,
              image_url: demoData.image_url,
              video_url: demoData.video_url,
              items: demoData.items,
            } as CampaignDetails);
          } else {
            throw new Error('Campaign not found');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [campaignId]);

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded mb-8" />
            <div className="h-64 bg-gray-200 rounded-lg mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'This campaign is no longer available.'}</p>
          <Link
            href="/muse"
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-ecru)]/95 backdrop-blur-md border-b border-[var(--color-divider)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Muse Logo/Brand */}
          <Link href="/home" className="flex items-center gap-2 group">
            <img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-10" />
          </Link>

          {/* Back Button */}
          <Link
            href="/home"
            className="flex items-center text-sm text-[var(--color-charcoal)] hover:text-[var(--color-gray-600)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
        {/* Video Background (if video_url exists) */}
        {campaign.video_url && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={campaign.video_url} type="video/mp4" />
          </video>
        )}

        {/* Static Image Background (if image_url exists and no video) */}
        {campaign.image_url && !campaign.video_url && (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white/90 text-sm font-medium uppercase tracking-wide">
              Curated Collection
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-4 max-w-3xl">
            {campaign.title}
          </h1>
          {campaign.subtitle && (
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl">{campaign.subtitle}</p>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-[var(--color-charcoal)]">
            {campaign.items.length} Item{campaign.items.length !== 1 ? 's' : ''} in this Collection
          </h2>
        </div>

        {campaign.items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--color-gray-600)] text-lg">No items available in this campaign yet.</p>
            <Link
              href="/search"
              className="inline-block mt-6 px-6 py-3 bg-[var(--color-charcoal)] text-white rounded-[var(--radius-full)] hover:bg-[var(--color-gray-800)] transition-colors duration-[var(--duration-base)]"
            >
              Browse All Items
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {campaign.items
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item) => (
                  <CampaignItemCard
                    key={item.id}
                    item={item}
                    isFavorite={favorites.has(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                ))}
            </div>

            {/* Pagination */}
            {campaign.items.length > itemsPerPage && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-[var(--radius-base)] bg-white text-[var(--color-charcoal)] border border-[var(--color-divider)] hover:bg-[var(--color-gray-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-base)]"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: Math.ceil(campaign.items.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-[var(--radius-base)] transition-colors duration-[var(--duration-base)] ${
                        currentPage === page
                          ? 'gradient-primary text-white'
                          : 'bg-white text-[var(--color-charcoal)] border border-[var(--color-divider)] hover:bg-[var(--color-gray-50)]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(campaign.items.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(campaign.items.length / itemsPerPage)}
                  className="px-4 py-2 rounded-[var(--radius-base)] bg-white text-[var(--color-charcoal)] border border-[var(--color-divider)] hover:bg-[var(--color-gray-50)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-base)]"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface CampaignItemCardProps {
  item: CampaignItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function CampaignItemCard({ item, isFavorite, onToggleFavorite }: CampaignItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link href={`/product/${item.id}`} className="group block">
      <div className="bg-white rounded-[var(--radius-base)] overflow-hidden shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-base)] transition-shadow duration-[var(--duration-base)]">
        {/* Image Container */}
        <div className="relative aspect-[3/4] bg-[var(--color-gray-100)] overflow-hidden">
          <img
            src={item.image_url || '/placeholder-product.jpg'}
            alt={item.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite();
            }}
            className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-[var(--shadow-subtle)] hover:bg-white transition-all duration-[var(--duration-base)] z-10"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-4 h-4 transition-all ${
                isFavorite ? 'fill-[var(--color-coral)] text-[var(--color-coral)]' : 'text-[var(--color-gray-600)]'
              }`}
            />
          </button>

          {/* Sale Badge */}
          {item.sale_price && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--color-coral)] text-white text-xs font-medium rounded-[var(--radius-base)] shadow-[var(--shadow-subtle)]">
              SALE
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          {/* Brand Name */}
          {item.brand_name && (
            <p className="text-xs font-medium text-[var(--color-gray-600)] mb-1 uppercase tracking-wide">
              {item.brand_name}
            </p>
          )}

          {/* Product Name */}
          <h3 className="text-sm text-[var(--color-charcoal)] mb-2 line-clamp-2 min-h-[2.5rem]">
            {item.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2">
            {item.sale_price ? (
              <>
                <span className="text-base font-semibold text-[var(--color-charcoal)]">${item.sale_price.toFixed(2)}</span>
                <span className="text-sm text-[var(--color-gray-500)] line-through">${item.price.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-base font-semibold text-[var(--color-charcoal)]">${item.price.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
