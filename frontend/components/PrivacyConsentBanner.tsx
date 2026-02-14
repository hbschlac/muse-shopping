'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ConsentPreferences {
  data_collection: boolean;
  personalization: boolean;
  marketing: boolean;
  analytics: boolean;
  third_party_sharing: boolean;
}

export default function PrivacyConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    data_collection: false,
    personalization: false,
    marketing: false,
    analytics: false,
    third_party_sharing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('privacy_consent_given');
    if (!hasConsented) {
      // Show banner after 1 second delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    const allConsents: ConsentPreferences = {
      data_collection: true,
      personalization: true,
      marketing: true,
      analytics: true,
      third_party_sharing: false, // Don't enable third-party by default
    };

    await submitConsent(allConsents);
  };

  const handleRejectAll = async () => {
    const noConsents: ConsentPreferences = {
      data_collection: false,
      personalization: false,
      marketing: false,
      analytics: false,
      third_party_sharing: false,
    };

    await submitConsent(noConsents);
  };

  const handleSavePreferences = async () => {
    await submitConsent(preferences);
  };

  const submitConsent = async (consents: ConsentPreferences) => {
    setIsSubmitting(true);

    try {
      // Always save to localStorage first (works for anonymous users)
      localStorage.setItem('privacy_consent_given', 'true');
      localStorage.setItem('privacy_preferences', JSON.stringify(consents));

      // If user is logged in, also save to backend
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          };

          await fetch('/api/v1/shopper/privacy/consent', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(consents),
          });
          // Don't fail if backend save fails - localStorage is sufficient
        } catch (backendError) {
          console.warn('Could not save consent to backend:', backendError);
        }
      }

      // Always close the banner after saving to localStorage
      setShowBanner(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Banner */}
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your Privacy Matters
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              We respect your privacy and give you control over your data
            </p>
          </div>
          <button
            onClick={handleRejectAll}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showDetails ? (
            <>
              <p className="text-sm text-gray-700">
                We use cookies and similar technologies to enhance your shopping experience,
                personalize content and recommendations, analyze site traffic, and understand
                where our audience is coming from.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleAcceptAll}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Accept All'}
                </button>
                <button
                  onClick={handleRejectAll}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject All
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Customize
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                By clicking "Accept All", you agree to our{' '}
                <a href="/privacy" className="underline hover:text-gray-700">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" className="underline hover:text-gray-700">
                  Terms of Service
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {/* Essential (always on) */}
                <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Essential</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Required for the website to function. Always enabled.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className="text-sm font-medium text-gray-500">Always On</span>
                  </div>
                </div>

                {/* Data Collection */}
                <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Data Collection</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Track your browsing activity to improve your experience and provide better recommendations.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => togglePreference('data_collection')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.data_collection ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.data_collection ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Personalization */}
                <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Personalization</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Use your data to personalize product recommendations and content just for you.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => togglePreference('personalization')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.personalization ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.personalization ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Analytics</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Help us understand how you use our site to improve overall performance.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => togglePreference('analytics')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.analytics ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Marketing */}
                <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Marketing</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Receive personalized offers, promotions, and product updates.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <button
                      onClick={() => togglePreference('marketing')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.marketing ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSavePreferences}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Preferences'}
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
