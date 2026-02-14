'use client';

import { useState } from 'react';
import Link from 'next/link';
import { checkWaitlistStatus, trackReferralShare, type WaitlistStatusResponse } from '@/lib/api/waitlist';
import PrivacyFooter from '@/components/PrivacyFooter';

export default function WaitlistStatusPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<WaitlistStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setStatus(null);

    try {
      const result = await checkWaitlistStatus(email);
      setStatus(result);
    } catch (err: any) {
      setError(err.message || 'Failed to check status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusText = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return 'Waiting for Invite';
      case 'invited':
        return 'Invited!';
      case 'converted':
        return 'Account Created';
      case 'unsubscribed':
        return 'Unsubscribed';
      default:
        return statusValue;
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return 'text-[var(--color-peach)] bg-[var(--color-peach-light)]/20';
      case 'invited':
        return 'text-green-600 bg-green-50';
      case 'converted':
        return 'text-[var(--color-blue)] bg-blue-50';
      case 'unsubscribed':
        return 'text-[var(--color-text-secondary)] bg-[var(--color-gray-100)]';
      default:
        return 'text-[var(--color-text-secondary)] bg-[var(--color-gray-100)]';
    }
  };

  const handleShareClick = async () => {
    if (!status?.my_referral_code || !email) return;

    const referralLink = `${window.location.origin}/waitlist?ref=${status.my_referral_code}`;
    const shareText = 'Join me on the Muse waitlist - shop all your favorite places at once with just one cart';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join the Muse Waitlist',
          text: shareText,
          url: referralLink,
        });
        // Track the share
        await trackReferralShare(email, 'native_share');
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        // Track the share
        await trackReferralShare(email, 'clipboard');
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4A785]/30 via-[#8EC5FF]/20 to-[#F4A785]/30 bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/muse-wordmark-grey.svg" alt="Muse" className="h-32" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">Check Your Status</h1>
          <p className="text-[var(--color-charcoal)]">Enter your email to see where you are in line</p>
        </div>

        {/* Form */}
        {!status && (
          <form onSubmit={handleSubmit} className="bg-white rounded-[12px] shadow-[var(--shadow-lifted)] p-8">
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-charcoal)] mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px]">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-[var(--color-charcoal)] text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Check Status'}
            </button>

            <div className="mt-6 text-center">
              <Link href="/waitlist" className="text-sm text-[var(--color-coral)] hover:underline">
                Not on the waitlist? Join now
              </Link>
            </div>
          </form>
        )}

        {/* Status Display */}
        {status && (
          <div className="bg-white rounded-[12px] shadow-[var(--shadow-lifted)] p-8">
            <div className="text-center mb-6">
              <div
                className={`inline-block px-4 py-2 rounded-[12px] font-semibold mb-4 ${getStatusColor(
                  status.status
                )}`}
              >
                {getStatusText(status.status)}
              </div>

              {status.status === 'pending' && (
                <>
                  <h2 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">
                    You're #{status.position} of {status.total.toLocaleString()} in line
                  </h2>
                  <p className="text-[var(--color-text-secondary)] mb-6">We'll email you when it's your turn!</p>

                  <div className="bg-[var(--color-ecru)] rounded-[12px] p-6">
                    <h3 className="font-semibold text-[var(--color-charcoal)] mb-3">Move up in line</h3>
                    <p className="text-sm text-[var(--color-text-tertiary)] mb-4">Share your referral link to get priority access</p>
                    <button
                      onClick={handleShareClick}
                      className="w-full py-3 px-4 bg-[var(--color-charcoal)] text-white font-medium rounded-[12px] hover:opacity-90 transition-all"
                    >
                      {copySuccess ? '✓ Link Copied!' : 'Share with a Friend'}
                    </button>
                  </div>
                </>
              )}

              {status.status === 'invited' && (
                <>
                  <h2 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">You're invited!</h2>
                  <p className="text-[var(--color-text-secondary)] mb-6">Check your email for your exclusive access link</p>
                  <Link
                    href="/welcome"
                    className="inline-block w-full py-4 px-6 gradient-primary text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)]"
                  >
                    Sign Up Now
                  </Link>
                </>
              )}

              {status.status === 'converted' && (
                <>
                  <h2 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">Welcome to Muse!</h2>
                  <p className="text-[var(--color-text-secondary)] mb-6">You're already a member</p>
                  <Link
                    href="/auth/login"
                    className="inline-block w-full py-4 px-6 gradient-primary text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)]"
                  >
                    Sign In
                  </Link>
                </>
              )}

              {status.status === 'unsubscribed' && (
                <>
                  <h2 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">You've been unsubscribed</h2>
                  <p className="text-[var(--color-text-secondary)] mb-6">Want to rejoin the waitlist?</p>
                  <Link
                    href="/waitlist"
                    className="inline-block w-full py-4 px-6 gradient-primary text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)]"
                  >
                    Join Waitlist
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setStatus(null);
                setEmail('');
              }}
              className="w-full mt-4 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-charcoal)] transition-colors"
            >
              Check another email
            </button>
          </div>
        )}

        {/* Privacy Footer */}
        <PrivacyFooter className="mt-8" />

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-charcoal)] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
