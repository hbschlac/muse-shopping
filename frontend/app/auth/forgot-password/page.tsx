'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/auth/login"
          className="text-gray-600 hover:text-gray-900 transition-colors duration-150"
        >
          ← Back to login
        </Link>
      </div>

      {/* Logo */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <img src="/muse-wordmark.svg" alt="Muse" className="h-24" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Forgot your password?
        </h1>
        <p className="text-base text-gray-600">
          No worries, we'll send you reset instructions
        </p>
      </div>

      {/* Content */}
      <div className="w-full max-w-sm">
        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-[12px] p-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Check your email
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              If an account exists for <strong>{email}</strong>, we've sent password reset instructions.
            </p>
            <p className="text-xs text-gray-500 text-center">
              Didn't receive the email? Check your spam folder or try again in a few minutes.
            </p>
            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-gray-900 font-medium hover:underline"
              >
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full h-12 px-4 rounded-[12px] border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[12px] p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 gradient-primary text-white rounded-[12px] flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {/* Remember Password Link */}
        {!success && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link
                href="/auth/login"
                className="text-gray-900 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Spacing */}
      <div className="h-20" />
    </div>
  );
}
