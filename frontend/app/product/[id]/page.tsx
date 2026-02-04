'use client';

import { useState } from 'react';
import { ChevronLeft, Heart, Share2, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';

// Mock data
const product = {
  id: '1',
  brand: 'Reformation',
  name: 'Linen Midi Dress',
  price: 178,
  images: [
    '/placeholder-1.jpg',
    '/placeholder-2.jpg',
    '/placeholder-3.jpg',
  ],
  description: 'A beautiful linen midi dress perfect for summer days.',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  details: {
    fabric: '100% Linen',
    care: 'Machine wash cold',
    shipping: 'Free shipping on orders over $100',
    returns: '30-day return policy',
  },
};

const relatedProducts = [
  { id: '2', image: '/placeholder-2.jpg', brand: 'Everlane', price: 98 },
  { id: '3', image: '/placeholder-3.jpg', brand: 'Madewell', price: 128 },
  { id: '4', image: '/placeholder-4.jpg', brand: 'Free People', price: 88 },
  { id: '5', image: '/placeholder-5.jpg', brand: 'Veja', price: 150 },
];

export default function ProductPage() {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-20 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors duration-150"
        >
          <ChevronLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors duration-150">
            <Share2 className="w-5 h-5 text-gray-900" />
          </button>
          <button
            onClick={() => setIsSaved(!isSaved)}
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

      {/* Hero Image */}
      <div className="pt-16">
        <div className="aspect-[3/4] bg-gray-100 relative">
          {/* Image carousel would go here */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Product Image
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {product.name}
          </h1>
          <p className="text-lg text-gray-600 mb-3">{product.brand}</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
        </div>

        {/* Size Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Size</h3>
          <div className="flex gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-6 py-3 rounded-[12px] text-sm font-medium transition-all duration-150 ${
                  selectedSize === size
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Add to Bag Button */}
        <button className="w-full h-14 gradient-primary text-white rounded-[24px] font-semibold mb-4 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
          Add to Bag
        </button>

        {/* Details Accordion */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          {Object.entries(product.details).map(([key, value]) => (
            <div key={key} className="border-b border-gray-200 pb-4">
              <button
                onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-[15px] font-semibold text-gray-900 capitalize">
                  {key}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                    expandedSection === key ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSection === key && (
                <p className="mt-3 text-[15px] text-gray-600">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Related Products */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">You Might Also Like</h2>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
