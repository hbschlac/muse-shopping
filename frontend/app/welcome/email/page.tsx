'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EmailSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // TODO: Send magic link or proceed to password page
      // For now, redirect to home page
      console.log('Email submitted:', email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to home page
      router.push('/home');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/welcome"
          className="text-gray-600 hover:text-gray-900 transition-colors duration-150"
        >
          ← Back
        </Link>
      </div>

      {/* Logo */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <img src="/muse-wordmark.svg" alt="Muse" className="h-24" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Sign in with email
        </h1>
        <p className="text-base text-gray-600">
          Enter your email to get started
        </p>
      </div>

      {/* Email Form */}
      <div className="w-full max-w-sm">
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
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full h-14 gradient-primary text-white rounded-[12px] flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-6">
          We'll send you a magic link to sign in
        </p>
      </div>

      {/* Spacing */}
      <div className="h-20" />
    </div>
  );
}
