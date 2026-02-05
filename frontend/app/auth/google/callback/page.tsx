'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeGoogleAuth } from '@/lib/api/auth';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        // Check for OAuth error
        if (error) {
          setStatus('error');
          setErrorMessage(
            searchParams.get('error_description') || 'Authorization failed'
          );
          return;
        }

        // Validate required parameters
        if (!code) {
          setStatus('error');
          setErrorMessage('Missing authorization code');
          return;
        }

        // Complete OAuth flow
        const authResponse = await completeGoogleAuth(code);

        setStatus('success');

        // Check if user is new or has incomplete profile
        // If user has no style preferences set, they should go through onboarding
        const isNewUser = !authResponse.user?.onboarding_completed;

        // Redirect based on whether user needs onboarding
        setTimeout(() => {
          if (isNewUser) {
            router.push('/onboarding/welcome');
          } else {
            router.push('/home');
          }
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to sign in with Google'
        );
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[12px] shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Signing In
            </h2>
            <p className="text-gray-600">
              Please wait while we sign you in with Google...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome!
            </h2>
            <p className="text-gray-600">
              You've been successfully signed in.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting you to home...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign In Failed
            </h2>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/welcome')}
              className="px-6 py-3 bg-[#333333] text-white rounded-[12px] text-[16px] font-medium hover:bg-[#6B6B6B] transition-all duration-[150ms] ease-out"
            >
              Return to Welcome
            </button>
          </>
        )}
      </div>
    </div>
  );
}
