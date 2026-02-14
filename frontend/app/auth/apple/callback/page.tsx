'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeAppleAuth } from '@/lib/api/auth';

function AppleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        // Apple uses form_post, so params might come from URL or POST body
        const code = searchParams.get('code');
        const idToken = searchParams.get('id_token');
        const state = searchParams.get('state');
        const user = searchParams.get('user');
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
        if (!code || !idToken || !state) {
          setStatus('error');
          setErrorMessage('Missing authorization parameters');
          return;
        }

        // Verify state matches
        const savedState = sessionStorage.getItem('apple_auth_state');
        if (!savedState || savedState !== state) {
          setStatus('error');
          setErrorMessage('Invalid state parameter - possible CSRF attack');
          return;
        }

        // Parse user data if provided
        let userData = null;
        if (user) {
          try {
            userData = JSON.parse(user);
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }

        // Complete OAuth flow
        const authResponse = await completeAppleAuth({
          code: code || undefined,
          id_token: idToken || undefined,
          state: state || undefined,
          user: user || undefined
        });

        setStatus('success');

        // Check if user is new or has incomplete profile
        const isNewUser = !authResponse.user?.onboarding_completed;

        console.log('Apple OAuth callback - authResponse:', {
          user: authResponse.user,
          onboarding_completed: authResponse.user?.onboarding_completed,
          isNewUser,
        });

        // Clear session state
        sessionStorage.removeItem('apple_auth_state');

        // Redirect based on whether user needs onboarding
        setTimeout(() => {
          const redirectPath = isNewUser ? '/onboarding/intro' : '/home';
          console.log('Redirecting to:', redirectPath);
          router.push(redirectPath);
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Failed to sign in with Apple'
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
              Please wait while we sign you in with Apple...
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
              You've been successfully signed in with Apple.
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
              className="px-6 py-3 bg-[var(--color-text-primary)] text-white rounded-[12px] text-[16px] font-medium hover:bg-[var(--color-text-tertiary)] transition-all duration-[150ms] ease-out"
            >
              Return to Welcome
            </button>
          </>
        )}
      </div>
    </div>
  );
}


export default function AppleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ecru)]" />}>
      <AppleCallbackContent />
    </Suspense>
  );
}
