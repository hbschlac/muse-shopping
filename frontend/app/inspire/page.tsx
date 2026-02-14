'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';

// Fashion product images - same as used in demo PDPs
const fashionImages = [
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800', // Oversized Cardigan
  'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800', // Wool Blazer
  'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800', // Cashmere Scarf
  'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800', // Knit Beanie
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800', // Ankle Boots
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800', // Turtleneck Sweater
  'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', // Wide Leg Pants
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', // Ribbed Knit Dress
  'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800', // Graphic Tee
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', // Linen Shirt
  'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800', // Floral Midi Skirt
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', // Canvas Sneakers
  'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800', // Leather Loafers
  'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800', // Organic Cotton Tote
  'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800', // Recycled Denim Jacket
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', // Bamboo T-Shirt
  'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800', // Hemp Blend Pants
  'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', // Cork Sandals
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800', // Classic Coat
  'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800', // Designer Jacket
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', // Fashion Item
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', // Shoes
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800', // Accessories
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800', // Dress
  'https://images.unsplash.com/photo-1515372039744-b8aef4c17ab9?w=800', // Elegant wear
];

const brands = [
  'Nordstrom', 'Target', 'Zara', 'Madewell', 'Reformation', 'Everlane', 'Aritzia',
  'Free People', 'Anthropologie', 'H&M', 'COS', 'ASOS', 'Revolve', 'Shopbop',
  'Net-a-Porter', 'Farfetch', 'Ssense', 'Urban Outfitters', 'Saks', 'Bloomingdales',
  'J.Crew', 'Banana Republic', 'Lululemon', 'Athleta', 'Gap', 'Old Navy', 'Uniqlo',
  'Massimo Dutti', 'Sezane', 'Ganni'
];

const influencers = [
  'StyleByEmma', 'FashionByMia', 'ChicWithJess', 'TrendyVibes', 'LuxeDaily',
  'UrbanStyle', 'MinimalChic', 'StreetStyle', 'GlamSquad', 'VogueLooks'
];

// Video URLs from Pexels - short fashion and lifestyle videos
const videoUrls = [
  'https://videos.pexels.com/video-files/3048342/3048342-sd_640_360_25fps.mp4',
  'https://videos.pexels.com/video-files/7989080/7989080-sd_640_360_30fps.mp4',
  'https://videos.pexels.com/video-files/6896093/6896093-sd_640_360_30fps.mp4',
  'https://videos.pexels.com/video-files/8313154/8313154-sd_640_360_25fps.mp4',
  'https://videos.pexels.com/video-files/7989076/7989076-sd_640_360_30fps.mp4',
  'https://videos.pexels.com/video-files/3298638/3298638-sd_640_360_30fps.mp4',
  'https://videos.pexels.com/video-files/5495787/5495787-sd_640_360_25fps.mp4',
  'https://videos.pexels.com/video-files/4439457/4439457-sd_640_360_25fps.mp4',
];

// Product names matching the fashion images
const productNames = [
  'Oversized Cardigan',
  'Wool Blazer',
  'Cashmere Scarf',
  'Knit Beanie',
  'Ankle Boots',
  'Turtleneck Sweater',
  'Wide Leg Pants',
  'Ribbed Knit Dress',
  'Graphic Tee',
  'Linen Shirt',
  'Floral Midi Skirt',
  'Canvas Sneakers',
  'Leather Loafers',
  'Cotton Tote',
  'Denim Jacket',
  'Bamboo T-Shirt',
  'Hemp Pants',
  'Cork Sandals',
  'Classic Coat',
  'Designer Jacket',
  'Fashion Item',
  'Shoes',
  'Accessories',
  'Dress',
  'Elegant wear',
];

// Generate thousands of items for endless scrolling
const inspirationItems = Array.from({ length: 3000 }, (_, i) => {
  const imageIndex = i % fashionImages.length;
  const isVideo = i % 5 === 0;

  // Generate product IDs that map to actual products
  const productId = 100 + i; // Unique IDs starting from 100

  // Generate deterministic likes count (no random for SSR compatibility)
  const likesCount = 100 + ((i * 137) % 50000); // Deterministic pseudo-random

  return {
    id: `inspire-${i}`,
    product_id: productId,
    type: isVideo ? 'video' : 'image',
    image_url: fashionImages[imageIndex],
    video_url: isVideo ? videoUrls[i % videoUrls.length] : undefined,
    product_name: productNames[imageIndex],
    brand: brands[i % brands.length],
    price: i % 3 === 0 ? 19.99 + (i % 200) : undefined,
    influencer: i % 6 === 0 ? influencers[i % influencers.length] : undefined,
    likes: likesCount,
  };
});

// Video tile component with autoplay on hover
function VideoTile({ item, isLiked, onLike }: { item: any; isLiked: boolean; onLike: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const handleTileClick = () => {
    router.push(`/product/${item.product_id}`);
  };

  return (
    <div
      className="relative group cursor-pointer"
      onClick={handleTileClick}
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
          autoPlay
          poster={item.image_url}
        >
          <source src={item.video_url} type="video/mp4" />
        </video>

        {/* Overlay on hover - pointer-events-none to allow clicks through */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {(item.influencer || item.brand) && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal)]">
                {item.influencer || item.brand}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center justify-between">
              <div>
                {item.price && (
                  <div className="text-white font-semibold text-lg">
                    ${item.price.toFixed(2)}
                  </div>
                )}
                <div className="text-white/80 text-xs mt-0.5">
                  {item.likes} likes
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform duration-150 pointer-events-auto"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isLiked
                      ? 'fill-[var(--color-coral)] text-[var(--color-coral)]'
                      : 'text-[var(--color-charcoal)]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InspirePage() {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleLike = (id: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleTileClick = (productId: number) => {
    router.push(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24 overflow-x-hidden">
      {/* Header */}
      <PageHeader />

      {/* Grid Layout - 3 tiles per row, uniform size */}
      <div className="w-full">
        <div className="grid grid-cols-3 gap-[0.5px]">
          {inspirationItems.map((item) => {
            const isLiked = likedItems.has(item.id);

            // Render video tile
            if (item.type === 'video') {
              return (
                <VideoTile
                  key={item.id}
                  item={item}
                  isLiked={isLiked}
                  onLike={() => toggleLike(item.id)}
                />
              );
            }

            // Render image tile
            return (
              <div
                key={item.id}
                className="relative group cursor-pointer"
                onClick={() => handleTileClick(item.product_id)}
              >
                {/* Image Container - Square aspect ratio */}
                <div className="relative aspect-square overflow-hidden bg-white">
                  <img
                    src={item.image_url}
                    alt={item.product_name || 'Product image'}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay on hover - pointer-events-none to allow clicks through */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {/* Top bar - Influencer or Brand */}
                    {(item.influencer || item.brand) && (
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal)]">
                          {item.influencer || item.brand}
                        </div>
                      </div>
                    )}

                    {/* Bottom bar - Price and Actions */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          {item.price && (
                            <div className="text-white font-semibold text-lg">
                              ${item.price.toFixed(2)}
                            </div>
                          )}
                          <div className="text-white/80 text-xs mt-0.5">
                            {item.likes} likes
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(item.id);
                          }}
                          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform duration-150 pointer-events-auto"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              isLiked
                                ? 'fill-[var(--color-coral)] text-[var(--color-coral)]'
                                : 'text-[var(--color-charcoal)]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
