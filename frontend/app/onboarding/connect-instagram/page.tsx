'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMockScanData, autoFollowCurators, type Curator, type Product } from '@/lib/api/instagram';

export default function ConnectInstagramPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [curatorsFound, setCuratorsFound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(45);
  const [currentCurators, setCurrentCurators] = useState<Curator[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [totalToScan, setTotalToScan] = useState(1000);
  const [allCurators, setAllCurators] = useState<Curator[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Simulate scanning progress
  useEffect(() => {
    if (!isScanning) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= totalToScan) {
          clearInterval(progressInterval);
          return totalToScan;
        }
        // Increment by random amount between 5-50
        const increment = Math.floor(Math.random() * 45) + 5;
        return Math.min(prev + increment, totalToScan);
      });
    }, 200);

    const curatorInterval = setInterval(() => {
      setCuratorsFound((prev) => {
        if (prev >= 50) return prev;
        return prev + Math.floor(Math.random() * 3) + 1;
      });
    }, 800);

    const timeInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(curatorInterval);
      clearInterval(timeInterval);
    };
  }, [isScanning, totalToScan]);

  // Simulate curator and product rotation
  useEffect(() => {
    if (!isScanning) return;

    const mockCurators: Curator[] = [
      { id: 1, name: 'Emma Chen', username: '@emmastyle', profile_image: 'https://i.pravatar.cc/300?img=1', follower_count: 45000 },
      { id: 2, name: 'Sophie Miller', username: '@sophiefashion', profile_image: 'https://i.pravatar.cc/300?img=5', follower_count: 82000 },
      { id: 3, name: 'Olivia Rose', username: '@oliviarose', profile_image: 'https://i.pravatar.cc/300?img=9', follower_count: 120000 },
      { id: 4, name: 'Ava Johnson', username: '@avastyle', profile_image: 'https://i.pravatar.cc/300?img=10', follower_count: 67000 },
      { id: 5, name: 'Mia Anderson', username: '@miamode', profile_image: 'https://i.pravatar.cc/300?img=23', follower_count: 93000 },
    ];

    const mockProducts: Product[] = [
      { id: 1, name: 'Summer Dress', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', brand: 'Reformation' },
      { id: 2, name: 'Leather Belt', image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583c2?w=400', brand: 'Gucci' },
      { id: 3, name: 'Flip Flops', image_url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400', brand: 'Havaianas' },
      { id: 4, name: 'Tote Bag', image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400', brand: 'Cuyana' },
      { id: 5, name: 'Sunglasses', image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', brand: 'Ray-Ban' },
    ];

    const rotationInterval = setInterval(() => {
      // Use fetched data if available, otherwise use mock data
      const curatorsToUse = allCurators.length > 0 ? allCurators : mockCurators;
      const productsToUse = allProducts.length > 0 ? allProducts : mockProducts;

      // Randomly select 5 curators and products
      const shuffledCurators = [...curatorsToUse].sort(() => Math.random() - 0.5);
      const shuffledProducts = [...productsToUse].sort(() => Math.random() - 0.5);

      setCurrentCurators(shuffledCurators.slice(0, 5));
      setCurrentProducts(shuffledProducts.slice(0, 5));
    }, 1500);

    // Initial set
    const curatorsToUse = allCurators.length > 0 ? allCurators : mockCurators;
    const productsToUse = allProducts.length > 0 ? allProducts : mockProducts;
    setCurrentCurators(curatorsToUse.slice(0, 5));
    setCurrentProducts(productsToUse.slice(0, 5));

    return () => clearInterval(rotationInterval);
  }, [isScanning, allCurators, allProducts]);

  const handleSkip = () => {
    router.push('/onboarding/preferences');
  };

  const handleContinue = async () => {
    try {
      // Auto-follow all discovered curators
      if (allCurators.length > 0) {
        const curatorIds = allCurators.map(c => c.id);
        await autoFollowCurators(curatorIds);
      }
    } catch (error) {
      console.error('Failed to auto-follow curators:', error);
    }

    router.push('/onboarding/preferences');
  };

  const startScanning = async () => {
    setIsScanning(true);

    try {
      // Fetch real data from API
      const data = await getMockScanData();
      setTotalToScan(data.totalScanned);
      setAllCurators(data.curators);
      setAllProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch scan data:', error);
      // Continue with mock data already in component
    }
  };

  // Check if scanning is complete
  useEffect(() => {
    if (progress >= totalToScan && isScanning) {
      // Scanning complete
    }
  }, [progress, totalToScan, isScanning]);

  if (!isScanning) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <button
          onClick={handleSkip}
          className="absolute top-8 left-8 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="max-w-md w-full text-center space-y-8">
          {/* Instagram to Muse connection visual */}
          <div className="flex items-center justify-center gap-6 mb-12">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
              <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>

            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>

            <div className="w-24 h-24 rounded-3xl bg-black flex items-center justify-center shadow-lg">
              <svg className="w-14 h-14 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 10 L50 45 L85 45 Q85 50 82 55 L50 90 L50 55 L15 55 Q15 50 18 45 Z"/>
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-serif text-gray-900">
              Find curators you love on Instagram
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed">
              Syncing your Instagram account is the easiest way to build your Circle. We'll quickly scan through who you follow on Instagram, and add all curators that have Muse accounts to your Circle.
            </p>
          </div>

          <div className="pt-8 space-y-4">
            <button
              onClick={startScanning}
              className="w-full px-8 py-4 bg-black text-white text-lg font-medium rounded-2xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02]"
            >
              CONNECT INSTAGRAM
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSkip}
                className="w-full px-8 py-4 text-gray-600 text-lg font-medium hover:text-gray-900 transition-colors"
              >
                SKIP
              </button>
              <button
                onClick={handleContinue}
                className="w-full px-8 py-4 bg-gray-100 text-gray-900 text-lg font-medium rounded-2xl hover:bg-gray-200 transition-colors"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif text-gray-900 mb-6">
            Building your Circle...
          </h1>
          <p className="text-xl text-gray-600">
            We're scanning through who you follow on Instagram to find the curators you already trust.
          </p>
        </div>

        {/* Animated carousel of curators */}
        <div className="mb-8 overflow-hidden">
          <div className="flex gap-4 transition-all duration-500">
            {currentCurators.map((curator, index) => (
              <div
                key={curator.id}
                className="flex-shrink-0 w-40 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={curator.profile_image}
                  alt={curator.name}
                  className="w-40 h-48 object-cover rounded-2xl shadow-lg"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Animated carousel of products */}
        <div className="mb-12 overflow-hidden">
          <div className="flex gap-4 transition-all duration-500">
            {currentProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-32 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-32 h-32 object-cover rounded-xl shadow-md"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${(progress / totalToScan) * 100}%` }}
            />
          </div>
        </div>

        {/* Progress text */}
        <div className="text-center space-y-2 mb-8">
          <p className="text-lg font-medium text-gray-900">
            {progress} of {totalToScan} loaded and {curatorsFound} curators found
          </p>
          <p className="text-base text-gray-600">
            {timeRemaining} seconds remaining
          </p>
        </div>

        {/* Continue button (shown when complete or can be clicked anytime) */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            className="px-12 py-4 bg-black text-white text-lg font-medium rounded-2xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02]"
            disabled={progress < totalToScan * 0.3}
          >
            CONTINUE
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
