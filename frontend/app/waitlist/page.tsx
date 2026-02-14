'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { joinWaitlist, trackReferralShare, trackReferralClick, type WaitlistSignupData } from '@/lib/api/waitlist';
import PrivacyFooter from '@/components/PrivacyFooter';

export default function WaitlistPage() {
  const [formData, setFormData] = useState<WaitlistSignupData>({
    email: '',
    first_name: '',
    last_name: '',
    interest_categories: [],
    favorite_brands: [],
    price_range_preference: undefined,
  });

  const [emailConsent, setEmailConsent] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [position, setPosition] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [priorityScore, setPriorityScore] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Extract UTM parameters from URL and track referral clicks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const referral_code = params.get('ref') || undefined;

    if (utm_source || utm_medium || utm_campaign || referral_code) {
      setFormData((prev) => ({
        ...prev,
        utm_source,
        utm_medium,
        utm_campaign,
        referral_code,
      }));
    }

    // Track referral click if ref parameter exists
    if (referral_code) {
      trackReferralClick(referral_code, { utm_source, utm_medium, utm_campaign }).catch((error) => {
        console.error('Failed to track referral click:', error);
      });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBrandInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const brands = e.target.value
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    setFormData((prev) => ({
      ...prev,
      favorite_brands: brands,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await joinWaitlist(formData);
      setPosition(response.position);
      setTotal(response.total);
      setReferralCode(response.my_referral_code);
      setPriorityScore(response.priority_score);
      setStep('success');
    } catch (error: any) {
      console.error('Failed to join waitlist:', error);
      setErrorMessage(error.message || 'Failed to join waitlist. Please try again.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareClick = async () => {
    const referralLink = `${window.location.origin}/waitlist?ref=${referralCode}`;
    const shareText = 'Shop all your favorites, one cart - Join the Muse waitlist';

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join the Muse Waitlist',
          text: shareText,
          url: referralLink,
        });
        // Track the share
        await trackReferralShare(formData.email, 'native_share');
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
        await trackReferralShare(formData.email, 'clipboard');
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4A785]/30 via-[#8EC5FF]/20 to-[#F4A785]/30 bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-[12px] shadow-[var(--shadow-lifted)] p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-[var(--color-peach)] rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-[var(--color-charcoal)] mb-2">You're on the list!</h1>
          <p className="text-lg text-[var(--color-text-secondary)] mb-6">
            You're <span className="font-bold text-[var(--color-coral)]">#{position} of {total?.toLocaleString()}</span> in line
          </p>

          <div className="bg-[var(--color-ecru)] rounded-[12px] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-charcoal)] mb-3">What happens next?</h2>
            <ul className="text-left space-y-3 text-[var(--color-text-tertiary)]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-coral)] mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>We'll send you an email when it's your turn</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-coral)] mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Your invite will include exclusive early access benefits</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-coral)] mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Share your referral link to move up in line</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleShareClick}
            className="w-full py-4 px-6 bg-[var(--color-charcoal)] text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)] mb-4"
          >
            {copySuccess ? '✓ Link Copied!' : 'Share with a Friend'}
          </button>

          <PrivacyFooter className="mt-8" />
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F4A785]/30 via-[#8EC5FF]/20 to-[#F4A785]/30 bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-[12px] shadow-[var(--shadow-lifted)] p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[var(--color-charcoal)] mb-2">Something went wrong</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">{errorMessage}</p>

          <button
            onClick={() => setStep('form')}
            className="w-full py-4 px-6 bg-[var(--color-charcoal)] text-white font-semibold rounded-[12px] hover:opacity-90 transition-all duration-[var(--duration-base)]"
          >
            Try Again
          </button>

          <PrivacyFooter className="mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4A785]/30 via-[#8EC5FF]/20 to-[#F4A785]/30 bg-[var(--color-ecru)] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img src="/muse-wordmark-grey.svg" alt="Muse" className="h-32" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-charcoal)] mb-4">Join the Waitlist</h1>
          <p className="text-xl text-[var(--color-charcoal)]">
            Shop all your favorites, one cart
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[12px] shadow-[var(--shadow-base)] p-8 md:p-10">
          {/* Basic Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-charcoal)] mb-6">Tell us about yourself</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--color-charcoal)] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-[var(--color-charcoal)] mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all"
                    placeholder="Jane"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-[var(--color-charcoal)] mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Favorite Brands & Retailers */}
          <div className="mb-8">
            <label htmlFor="favorite_brands" className="block text-lg font-bold text-[var(--color-charcoal)] mb-2">
              Favorite Brands & Places to Shop (Optional)
            </label>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              Tell us your favorite brands, retailers, and marketplaces (comma-separated)
            </p>
            <input
              type="text"
              id="favorite_brands"
              name="favorite_brands"
              onChange={handleBrandInput}
              className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all"
              placeholder="Nike, Zara, Amazon, Target, Nordstrom"
            />
          </div>

          {/* How Did You Hear About Us */}
          <div className="mb-8">
            <label htmlFor="referral_source" className="block text-lg font-bold text-[var(--color-charcoal)] mb-2">
              How did you hear about us? (Optional)
            </label>
            <select
              id="referral_source"
              name="referral_source"
              value={formData.referral_source || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-[var(--color-divider)] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral)] focus:border-transparent transition-all bg-white"
            >
              <option value="">Select an option</option>
              <option value="word_of_mouth">Word of mouth</option>
              <option value="email">Email</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter / X</option>
              <option value="tiktok">TikTok</option>
              <option value="search_engine">Search engine (Google, etc.)</option>
              <option value="online_ad">Online ad</option>
              <option value="podcast">Podcast</option>
              <option value="blog_article">Blog or article</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Email Consent */}
          <div className="mb-8">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 text-[var(--color-coral)] border-[var(--color-divider)] rounded focus:ring-2 focus:ring-[var(--color-coral)]"
              />
              <span className="text-sm text-[var(--color-charcoal)]">
                I'd like to receive updates, tips, and exclusive offers from Muse via email. You can unsubscribe at any time.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 bg-[var(--color-charcoal)] text-white font-bold text-lg rounded-full hover:opacity-90 transition-all duration-[var(--duration-base)] shadow-[var(--shadow-base)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : 'Join the Waitlist'}
          </button>

          {/* Contact Us Link */}
          <div className="text-center mt-4 mb-6">
            <a
              href="mailto:support@muse.shopping"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-charcoal)] transition-colors"
            >
              Contact Us
            </a>
          </div>

          <PrivacyFooter className="mt-0" />
        </form>

        {/* Already on the list */}
        <div className="text-center mt-8">
          <p className="text-[var(--color-charcoal)]">
            Already on the waitlist?{' '}
            <Link href="/waitlist/status" className="text-[var(--color-charcoal)] font-semibold hover:underline">
              Check your status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
