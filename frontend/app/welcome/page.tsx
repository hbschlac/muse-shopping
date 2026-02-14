'use client';

import Link from 'next/link';
import { initiateGoogleAuth, initiateAppleAuth } from '@/lib/api/auth';

export default function WelcomePage() {
  const handleGoogleAuth = async () => {
    try {
      await initiateGoogleAuth();
    } catch (error) {
      console.error('Google auth failed:', error);
      alert('Failed to start Google sign in. Please try again.');
    }
  };

  const handleAppleAuth = async () => {
    try {
      await initiateAppleAuth();
    } catch (error) {
      console.error('Apple auth failed:', error);
      alert('Failed to start Apple sign in. Please try again.');
    }
  };

  return (
    <div className="app-hero welcome-cream-gradient">
      <div className="app-hero__grain" />
      <div className="app-hero__content">
        {/* Logo */}
        <div className="text-center mb-16">
        <div className="flex justify-center mb-8">
          <img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-64 md:h-80" />
        </div>
        <p className="text-xl md:text-2xl text-gray-600 font-light px-6 max-w-md mx-auto">
          Shop all your favorites in one place
        </p>
      </div>

      {/* Auth Options */}
      <div className="w-full max-w-sm space-y-4 px-6">
        {/* Continue with Apple */}
        <button
          onClick={handleAppleAuth}
          className="w-full h-14 bg-gray-900/20 backdrop-blur-md text-gray-900 rounded-[12px] flex items-center justify-center font-medium border border-gray-900/10 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-900/30 active:scale-[0.98] cursor-pointer shadow-subtle"
        >
          Continue with Apple
        </button>

        {/* Continue with Google */}
        <button
          onClick={handleGoogleAuth}
          className="w-full h-14 bg-white/40 backdrop-blur-md text-gray-900 rounded-[12px] flex items-center justify-center font-medium border border-gray-900/10 transition-all duration-150 hover:scale-[1.02] hover:bg-white/60 active:scale-[0.98] cursor-pointer shadow-subtle"
        >
          Continue with Google
        </button>

        {/* Email Option */}
        <Link
          href="/welcome/email"
          className="block w-full h-14 bg-[#F4A785]/30 backdrop-blur-md text-gray-900 rounded-[12px] flex items-center justify-center font-semibold border border-[#F4A785]/20 transition-all duration-150 hover:scale-[1.02] hover:bg-[#F4A785]/40 active:scale-[0.98] shadow-subtle"
        >
          Email
        </Link>
      </div>

      {/* Browse as Guest */}
      <div className="mt-12">
        <Link
          href="/home"
          className="text-gray-600 font-medium hover:text-gray-900 transition-colors duration-150"
        >
          Browse as guest
        </Link>
      </div>

      {/* Privacy & Terms Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          <Link
            href="/profile/privacy"
            className="text-gray-600 hover:text-gray-900 transition-colors duration-150 underline"
          >
            Privacy Policy
          </Link>
          {' · '}
          <Link
            href="/terms"
            className="text-gray-600 hover:text-gray-900 transition-colors duration-150 underline"
          >
            Terms of Service
          </Link>
        </p>
      </div>

      {/* Spacing */}
      <div className="h-20" />
      </div>
    </div>
  );
}
