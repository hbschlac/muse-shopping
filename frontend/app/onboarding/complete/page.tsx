'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home newsfeed after 2 seconds
    const timer = setTimeout(() => {
      router.push('/home');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">You're all set!</h1>
        <p className="text-lg text-gray-600 mb-2">Welcome to Muse</p>
        <p className="text-sm text-gray-500">Taking you to your personalized newsfeed...</p>
      </div>
    </div>
  );
}
