'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMockScanData } from '@/lib/api/instagram';
import ScanningModal from '@/components/ScanningModal';
import BrandLogo from '@/components/BrandLogo';

type Step = 'name' | 'style' | 'connect' | 'brands' | 'done';

const popularBrands = [
  { id: 'nordstrom', name: 'Nordstrom', logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
  { id: 'target', name: 'Target', logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
  { id: 'zara', name: 'Zara', logo: 'https://logos-world.net/wp-content/uploads/2020/04/Zara-Logo.png' },
  { id: 'madewell', name: 'Madewell', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Madewell_logo.svg/2560px-Madewell_logo.svg.png' },
  { id: 'everlane', name: 'Everlane', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Everlane_logo.svg/2560px-Everlane_logo.svg.png' },
  { id: 'reformation', name: 'Reformation', logo: 'https://logowik.com/content/uploads/images/reformation4165.logowik.com.webp' },
  { id: 'aeropostale', name: 'Aéropostale', logo: 'https://seeklogo.com/images/A/aeropostale-logo-C1F4F5E5F7-seeklogo.com.png' },
  { id: 'free-people', name: 'Free People', logo: 'https://logowik.com/content/uploads/images/free-people8936.logowik.com.webp' },
];

function OnboardingStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [styleDescription, setStyleDescription] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [searchResults, setSearchResults] = useState<typeof popularBrands>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanType, setScanType] = useState<'instagram' | 'gmail'>('instagram');

  // Check if returning from OAuth callback
  useEffect(() => {
    const scanned = searchParams?.get('scanned');
    const oauthType = searchParams?.get('type');

    if (scanned === 'true' && oauthType) {
      // User just completed OAuth scan, show the results modal
      setScanType(oauthType as 'instagram' | 'gmail');
      setScanModalOpen(true);

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('scanned');
      url.searchParams.delete('type');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleNameContinue = () => {
    if (name.trim()) {
      setStep('style');
    }
  };

  const handleStyleContinue = () => {
    setStep('connect');
  };

  const handleInstagramConnect = () => {
    setScanType('instagram');
    setScanModalOpen(true);
  };

  const handleGmailConnect = () => {
    setScanType('gmail');
    setScanModalOpen(true);
  };

  const handleScanComplete = (selectedCurators: number[]) => {
    // TODO: Send to backend to actually follow these curators
  };

  const handleConnectContinue = () => {
    setStep('brands');
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleBrandSearch = async (query: string) => {
    setBrandSearch(query);

    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/brands?search=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();

      // Convert API response to match popularBrands format
      const brands = data.data?.brands || [];
      setSearchResults(brands.map((b: any) => ({
        id: b.slug || b.id.toString(),
        name: b.name,
        logo: b.logo_url || ''
      })));
    } catch (error) {
      console.error('Brand search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBrandsContinue = () => {
    setStep('done');
  };

  const handleFinish = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-[[var(--color-ecru)]] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6">
        <button
          onClick={() => router.push('/welcome')}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-10" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">

          {/* Name Step */}
          {step === 'name' && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-semibold text-[[var(--color-text-primary)]] mb-3 text-center">
                What's your name?
              </h1>
              <p className="text-base text-[#6B6B6B] mb-8 text-center">
                We'll use this to personalize your experience
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameContinue()}
                placeholder="Your name"
                className="w-full h-14 px-4 rounded-[12px] border-2 border-gray-200 text-base text-[[var(--color-text-primary)]] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[var(--color-peach-light)] transition-colors mb-4"
                autoFocus
              />
              <button
                onClick={handleNameContinue}
                disabled={!name.trim()}
                className="w-full h-14 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continue
              </button>
            </div>
          )}

          {/* Style Step */}
          {step === 'style' && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-semibold text-[[var(--color-text-primary)]] mb-3 text-center">
                Describe your style
              </h1>
              <p className="text-base text-[#6B6B6B] mb-8 text-center">
                Optional, but helps us personalize your feed
              </p>
              <textarea
                value={styleDescription}
                onChange={(e) => setStyleDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStyleContinue();
                  }
                }}
                placeholder="E.g., minimalist, vintage, streetwear..."
                className="w-full h-32 px-4 py-3 rounded-[12px] border-2 border-gray-200 text-base text-[[var(--color-text-primary)]] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[var(--color-peach-light)] transition-colors resize-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleStyleContinue}
                  className="flex-1 h-14 bg-gray-200 text-[[var(--color-text-primary)]] rounded-[12px] font-semibold transition-colors hover:bg-gray-300"
                >
                  Skip
                </button>
                <button
                  onClick={handleStyleContinue}
                  className="flex-1 h-14 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Connect Step */}
          {step === 'connect' && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-semibold text-[[var(--color-text-primary)]] mb-3 text-center">
                Connect your accounts
              </h1>
              <p className="text-base text-[#6B6B6B] mb-6 text-center">
                We'll see where you currently shop and make sure those brands are curated for you
              </p>
              <div className="bg-[[var(--color-ecru)]] border border-gray-200 rounded-[12px] p-3 mb-6">
                <p className="text-xs text-[#6B6B6B] text-center">
                  🔒 Your privacy matters. We only use this to personalize your experience.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGmailConnect}
                  className="w-full h-14 bg-white border-2 border-gray-200 rounded-[12px] text-[[var(--color-text-primary)]] font-semibold hover:border-[var(--color-peach-light)] transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  Connect Gmail
                </button>
                <button
                  onClick={handleInstagramConnect}
                  className="w-full h-14 bg-white border-2 border-gray-200 rounded-[12px] text-[[var(--color-text-primary)]] font-semibold hover:border-[var(--color-peach-light)] transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="url(#instagram-gradient)" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#833AB4'}} />
                        <stop offset="50%" style={{stopColor: '#FD1D1D'}} />
                        <stop offset="100%" style={{stopColor: '#FCB045'}} />
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Connect Instagram
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConnectContinue}
                  className="flex-1 h-14 bg-gray-200 text-[[var(--color-text-primary)]] rounded-[12px] font-semibold transition-colors hover:bg-gray-300"
                >
                  Skip
                </button>
                <button
                  onClick={handleConnectContinue}
                  className="flex-1 h-14 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Brands Step */}
          {step === 'brands' && (
            <div className="animate-fade-in">
              <h1 className="text-3xl font-semibold text-[[var(--color-text-primary)]] mb-3 text-center">
                Select your favorite brands and stores
              </h1>
              <p className="text-base text-[#6B6B6B] mb-6 text-center">
                Optional — we'll still give you great recommendations
              </p>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => handleBrandSearch(e.target.value)}
                  placeholder="Search for brands or stores..."
                  className="w-full h-12 px-4 rounded-[12px] border-2 border-gray-200 text-base text-[[var(--color-text-primary)]] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[var(--color-peach-light)] transition-colors"
                />
                {isSearching && (
                  <p className="text-sm text-[#9A9A9A] mt-2">Searching...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {(searchResults.length > 0 ? searchResults : popularBrands).map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => toggleBrand(brand.id)}
                    className={`p-4 rounded-[12px] border-2 transition-all ${
                      selectedBrands.includes(brand.id)
                        ? 'border-[var(--color-coral)] bg-[var(--color-coral)]/5'
                        : 'border-gray-200 bg-white hover:border-[var(--color-peach-light)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 flex items-center justify-center">
                        <BrandLogo
                          brandName={brand.name}
                          fallbackUrl={brand.logo}
                          className="max-w-full max-h-full object-contain"
                          showFallbackGradient={true}
                        />
                      </div>
                      <span className="text-sm font-medium text-[[var(--color-text-primary)]]">{brand.name}</span>
                    </div>
                  </button>
                ))}
                {/* Show "Create new brand" option when searching and no results */}
                {brandSearch.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                  <button
                    onClick={() => {
                      // Add the search term as a new brand
                      const newBrandId = `new-${brandSearch.toLowerCase().replace(/\s+/g, '-')}`;
                      setSelectedBrands(prev => [...prev, newBrandId]);
                      // Add to search results so it shows as selected
                      setSearchResults([{
                        id: newBrandId,
                        name: brandSearch,
                        logo: ''
                      }]);
                      setBrandSearch('');
                    }}
                    className="p-4 rounded-[12px] border-2 border-dashed border-[var(--color-peach-light)] bg-white hover:bg-[var(--color-peach-light)]/5 transition-all"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--color-coral)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[[var(--color-text-primary)]]">Create "{brandSearch}"</span>
                    </div>
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBrandsContinue}
                  className="flex-1 h-14 bg-gray-200 text-[[var(--color-text-primary)]] rounded-[12px] font-semibold transition-colors hover:bg-gray-300"
                >
                  Skip
                </button>
                <button
                  onClick={handleBrandsContinue}
                  className="flex-1 h-14 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {selectedBrands.length > 0 ? `Continue (${selectedBrands.length})` : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && (
            <div className="animate-fade-in text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🎊</div>
                <h1 className="text-3xl font-semibold text-[[var(--color-text-primary)]] mb-3">
                  You're all set!
                </h1>
                <p className="text-base text-[#6B6B6B]">
                  Time to discover items you'll love
                </p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full h-14 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scanning Modal */}
      <ScanningModal
        type={scanType}
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        onComplete={handleScanComplete}
      />

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}


export default function OnboardingStart() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ecru)]" />}>
      <OnboardingStartContent />
    </Suspense>
  );
}
