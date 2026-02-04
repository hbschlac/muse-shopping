'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import Image from 'next/image';

interface ProductCardProps {
  image: string;
  brand: string;
  name?: string;
  price: number;
  id: string;
}

export default function ProductCard({ image, brand, name, price, id }: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSaved(!isSaved);
  };

  return (
    <div className="group cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
      <div className="relative aspect-[3/4] bg-gray-100 rounded-[16px] overflow-hidden mb-2">
        <Image
          src={image}
          alt={name || brand}
          fill
          className="object-cover"
        />
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-all duration-150 hover:scale-110 active:scale-95"
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-200 ${
              isSaved ? 'fill-[var(--color-coral)] text-[var(--color-coral)] scale-110' : 'text-gray-700'
            }`}
          />
        </button>
      </div>
      <div className="px-1">
        <p className="text-[13px] font-semibold text-gray-900 truncate">
          {brand}
        </p>
        <p className="text-[13px] text-gray-500">
          ${price.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
