'use client';

import { useState, useEffect } from 'react';

interface Curator {
  id: number;
  name: string;
  username: string;
  profile_image: string;
  follower_count: number;
  category?: string;
}

interface ScanResults {
  totalScanned: number;
  curatorsFound: number;
  curators: Curator[];
  products?: any[];
  timeElapsed: number;
}

interface ScanningModalProps {
  type: 'instagram' | 'gmail';
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedCurators: number[]) => void;
}

export default function ScanningModal({ type, isOpen, onClose, onComplete }: ScanningModalProps) {
  const [stage, setStage] = useState<'scanning' | 'results'>('scanning');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [selectedCurators, setSelectedCurators] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setStage('scanning');
      setProgress(0);
      setResults(null);
      setSelectedCurators([]);
      return;
    }

    // Initiate OAuth flow for the selected type
    const initiateOAuth = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const token = localStorage.getItem('authToken');

        if (!token) {
          // No auth token - fallback to mock scan
          startMockScan();
          return;
        }

        let authUrlResponse;

        if (type === 'gmail') {
          // Initiate Gmail OAuth
          authUrlResponse = await fetch(`${API_URL}/email/connect`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } else {
          // Initiate Instagram OAuth
          authUrlResponse = await fetch(`${API_URL}/social/instagram/connect`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }

        if (!authUrlResponse.ok) {
          throw new Error(`HTTP ${authUrlResponse.status}`);
        }

        const authData = await authUrlResponse.json();

        if (!authData.success || !authData.data?.authUrl) {
          throw new Error('Failed to get authorization URL');
        }

        // Store current onboarding state so we can resume after OAuth
        localStorage.setItem('oauthReturnTo', '/onboarding/start');
        localStorage.setItem('oauthType', type);
        localStorage.setItem('oauthScanPending', 'true');

        // Redirect to OAuth provider
        window.location.href = authData.data.authUrl;
      } catch (error) {
        console.error('OAuth initiation error:', error);

        // Fallback to mock scan for demo purposes
        startMockScan();
      }
    };

    // Fallback mock scan function
    const startMockScan = () => {
      // Simulate scanning progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Fetch mock or real results
      const fetchResults = async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
          const token = localStorage.getItem('authToken');

          // Try to get real scan results if authenticated
          if (token && type === 'gmail') {
            try {
              const statusResponse = await fetch(`${API_URL}/email/status`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.data?.lastScanResult) {
                  // We have real Gmail scan results!
                  const scanResult = statusData.data.lastScanResult;

                  // Parse brands_matched JSON string
                  let brandsMatched = [];
                  try {
                    brandsMatched = typeof scanResult.brands_matched === 'string'
                      ? JSON.parse(scanResult.brands_matched)
                      : scanResult.brands_matched || [];
                  } catch (e) {
                    console.error('Failed to parse brands_matched:', e);
                    brandsMatched = [];
                  }

                  // Convert brands to curator format for display
                  const curators = brandsMatched.map((brand: any, index: number) => ({
                    id: brand.brandId || index,
                    name: brand.brandName || 'Unknown Brand',
                    username: brand.brandName?.toLowerCase().replace(/\s+/g, '') || 'unknown',
                    profile_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.brandName || 'Brand')}&background=F4C4B0&color=fff`,
                    follower_count: 0, // Brands don't have follower counts
                    category: 'Store',
                  }));

                  setTimeout(() => {
                    setResults({
                      totalScanned: scanResult.emails_scanned || 0,
                      curatorsFound: curators.length,
                      curators,
                      timeElapsed: Math.floor((scanResult.scan_duration_ms || 0) / 1000),
                    });
                    setStage('results');
                    // Auto-select all brands
                    setSelectedCurators(curators.map((c: any) => c.id));
                  }, 2500);
                  return;
                }
              }
            } catch (err) {
            }
          }

          // Fallback to mock scan
          const response = await fetch(`${API_URL}/instagram/mock-scan`);
          const data = await response.json();

          setTimeout(() => {
            setResults(data.data);
            setStage('results');
            // Auto-select all curators
            setSelectedCurators(data.data.curators.map((c: Curator) => c.id));
          }, 2500);
        } catch (error) {
          console.error('Scan error:', error);
          alert('Unable to connect at this time. Please try again later.');
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      };

      fetchResults();
    };

    // Start OAuth flow
    initiateOAuth();

    return () => {};
  }, [isOpen, onClose, type]);

  const toggleCurator = (id: number) => {
    setSelectedCurators(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    onComplete(selectedCurators);
    onClose();
  };

  if (!isOpen) return null;

  const title = type === 'instagram' ? 'Scanning Instagram' : 'Scanning Gmail';
  const description = type === 'instagram'
    ? 'Looking for influencers and style creators you follow...'
    : 'Finding brands and stores from your receipts...';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {stage === 'scanning' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            {/* Scanning Animation */}
            <div className="mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-[var(--color-peach-light)] border-t-[var(--color-coral)] animate-spin"></div>
            </div>

            <h2 className="text-2xl font-semibold text-[[var(--color-text-primary)]] mb-2 text-center">
              {title}
            </h2>
            <p className="text-base text-[#6B6B6B] mb-6 text-center max-w-md">
              {description}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--gradient-coral)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-[#9A9A9A] mt-2 text-center">
                {progress}% complete
              </p>
            </div>
          </div>
        )}

        {stage === 'results' && results && (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-[[var(--color-text-primary)]] mb-2">
                Found {results.curatorsFound} {type === 'instagram' ? 'influencers' : 'brands'}!
              </h2>
              <p className="text-sm text-[#6B6B6B]">
                Scanned {results.totalScanned} {type === 'instagram' ? 'accounts' : 'emails'} in {results.timeElapsed}s
              </p>
            </div>

            {/* Curators List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3">
                {results.curators.map((curator) => (
                  <button
                    key={curator.id}
                    onClick={() => toggleCurator(curator.id)}
                    className={`flex items-center gap-4 p-4 rounded-[12px] border-2 transition-all ${
                      selectedCurators.includes(curator.id)
                        ? 'border-[var(--color-coral)] bg-[var(--color-coral)]/5'
                        : 'border-gray-200 bg-white hover:border-[var(--color-peach-light)]'
                    }`}
                  >
                    {/* Profile Image */}
                    <img
                      src={curator.profile_image}
                      alt={curator.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    {/* Info */}
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-[[var(--color-text-primary)]]">{curator.name}</h3>
                      <p className="text-sm text-[#6B6B6B]">@{curator.username}</p>
                    </div>

                    {/* Stats */}
                    {type === 'instagram' && curator.follower_count > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-[[var(--color-text-primary)]]">
                          {curator.follower_count.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#9A9A9A]">followers</p>
                      </div>
                    )}
                    {type === 'gmail' && curator.category && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-[[var(--color-text-primary)]]">
                          {curator.category}
                        </p>
                      </div>
                    )}

                    {/* Checkmark */}
                    {selectedCurators.includes(curator.id) && (
                      <div className="w-6 h-6 bg-[var(--color-coral)] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 bg-gray-200 text-[[var(--color-text-primary)]] rounded-[12px] font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 h-12 bg-[var(--gradient-coral)] text-white rounded-[12px] font-semibold hover:shadow-lg transition-shadow"
              >
                Follow {selectedCurators.length} {type === 'instagram' ? 'influencers' : 'brands'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
