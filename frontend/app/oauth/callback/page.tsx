'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [message, setMessage] = useState('Processing connection...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get return URL from localStorage
        const returnTo = localStorage.getItem('oauthReturnTo') || '/onboarding/start';
        const oauthType = localStorage.getItem('oauthType') || 'instagram';
        const scanPending = localStorage.getItem('oauthScanPending') === 'true';

        if (!scanPending) {
          // No scan pending, just redirect
          router.push(returnTo);
          return;
        }

        // Show scanning animation
        setMessage(`Scanning your ${oauthType === 'gmail' ? 'emails' : 'Instagram account'}...`);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + 5;
          });
        }, 150);

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const token = localStorage.getItem('authToken');

        if (!token) {
          throw new Error('No authentication token found');
        }

        if (oauthType === 'gmail') {
          // Wait for the backend scan to complete
          // The backend already triggered the scan in the callback handler
          // We need to poll for results or wait a reasonable amount of time

          let attempts = 0;
          const maxAttempts = 10; // 10 seconds max wait

          while (attempts < maxAttempts) {
            try {
              const statusResponse = await fetch(`${API_URL}/email/status`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.data?.lastScanResult) {
                  // Scan completed!
                  break;
                }
              }
            } catch (err) {
              console.error('Error checking scan status:', err);
            }

            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            setProgress(Math.min(95, 50 + (attempts * 4)));
          }
        } else {
          // For Instagram, just wait a moment
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        clearInterval(progressInterval);
        setProgress(100);
        setStatus('success');
        setMessage('Connection successful!');

        // Clean up localStorage
        localStorage.removeItem('oauthScanPending');

        // Redirect back to onboarding after a short delay
        setTimeout(() => {
          router.push(returnTo + '?scanned=true&type=' + oauthType);
        }, 1500);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Failed to complete connection. Redirecting...');

        // Clean up and redirect anyway
        localStorage.removeItem('oauthScanPending');

        setTimeout(() => {
          const returnTo = localStorage.getItem('oauthReturnTo') || '/onboarding/start';
          router.push(returnTo);
        }, 2000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[[var(--color-ecru)]] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Scanning Animation */}
        {status === 'scanning' && (
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-[var(--color-peach-light)] border-t-[var(--color-coral)] animate-spin"></div>
          </div>
        )}

        {/* Success Icon */}
        {status === 'success' && (
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Error Icon */}
        {status === 'error' && (
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-semibold text-[[var(--color-text-primary)]] mb-4">
          {message}
        </h2>

        {/* Progress Bar */}
        {status === 'scanning' && (
          <div className="w-full max-w-md mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--gradient-coral)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-[#9A9A9A] mt-2">
              {progress}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
