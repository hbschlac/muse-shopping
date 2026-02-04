import { Plus } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

// Mock data - replace with actual API calls
const collections = [
  { id: 'all', name: 'All', count: 24 },
  { id: 'fall', name: 'Fall Fits', count: 8 },
  { id: 'date', name: 'Date Night', count: 6 },
  { id: 'vintage', name: 'Vintage', count: 5 },
  { id: 'work', name: 'Work', count: 5 },
];

const savedProducts = [
  { id: '1', image: '/placeholder-1.jpg', brand: 'Reformation', price: 178 },
  { id: '2', image: '/placeholder-2.jpg', brand: 'Everlane', price: 98 },
  { id: '3', image: '/placeholder-3.jpg', brand: 'Madewell', price: 128 },
  { id: '4', image: '/placeholder-4.jpg', brand: 'Free People', price: 88 },
  { id: '5', image: '/placeholder-5.jpg', brand: 'Veja', price: 150 },
  { id: '6', image: '/placeholder-6.jpg', brand: 'Girlfriend Collective', price: 68 },
];

export default function ClosetPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <div className="bg-[var(--color-ecru)] pt-12 pb-4 px-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Closet</h1>
        <button className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-coral)] hover:text-[var(--color-peach)] transition-colors duration-150">
          <Plus className="w-4 h-4" />
          Create collection
        </button>
      </div>

      {/* Collections Row */}
      <div className="py-4 px-4">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {collections.map((collection) => (
            <button
              key={collection.id}
              className="flex-shrink-0 px-5 py-2.5 bg-white rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-150 shadow-sm hover:shadow-md"
            >
              <span>{collection.name}</span>
              <span className="ml-2 text-gray-400">({collection.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Grid */}
      <div className="px-4 pt-4">
        {savedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {savedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full mb-6" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Save pieces you love
            </h2>
            <p className="text-gray-600 mb-8">
              They'll live here in your closet
            </p>
            <button className="gradient-primary text-white px-8 py-3 rounded-[24px] font-semibold transition-transform duration-150 hover:scale-105 active:scale-95">
              Browse
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
