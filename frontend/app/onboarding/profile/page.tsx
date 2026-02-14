'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import PrivacyFooter from '@/components/PrivacyFooter';

const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+'
];

export default function OnboardingProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'age' | 'location'>('age');

  // Form data
  const [ageRange, setAgeRange] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('United States');

  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      if (!currentUser) {
        router.push('/welcome');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/welcome');
    } finally {
      setLoading(false);
    }
  };

  const handleAgeNext = () => {
    if (!ageRange) {
      setError('Please select your age range');
      return;
    }
    setError('');
    setStep('location');
  };

  const handleLocationSubmit = async () => {
    if (!city || !state) {
      setError('Please provide your city and state');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // Call onboarding API
      await fetch('/api/v1/users/me/onboarding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          age_range: ageRange,
          location_city: city,
          location_state: state,
          location_country: country
        })
      });

      // Continue to email connection
      router.push('/onboarding/connect-email');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('Failed to save your information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getGradient = () => {
    if (step === 'age') {
      return 'from-green-400 via-teal-400 to-blue-500';
    }
    return 'from-yellow-400 via-orange-400 to-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br ${getGradient()} flex items-center justify-center p-4 transition-all duration-700`}>
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg w-full">
        <div className="animate-slide-up">
          {/* Progress */}
          <div className="text-center mb-8">
            <p className="text-white/80 text-sm font-medium mb-2">
              Step {step === 'age' ? '1' : '2'} of 2
            </p>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: step === 'age' ? '50%' : '100%' }}
              ></div>
            </div>
          </div>

          {/* Age Range Step */}
          {step === 'age' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-10 border border-white/20">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                What's your age range?
              </h1>
              <p className="text-white/80 mb-8">
                This helps us show you relevant styles and trends
              </p>

              <div className="space-y-3 mb-8">
                {AGE_RANGES.map((range) => (
                  <button
                    key={range}
                    onClick={() => setAgeRange(range)}
                    className={`w-full p-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                      ageRange === range
                        ? 'bg-white text-purple-600 shadow-lg scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-white bg-red-500/30 backdrop-blur px-4 py-3 rounded-xl mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleAgeNext}
                disabled={!ageRange}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-200 ${
                  ageRange
                    ? 'bg-white text-purple-600 hover:scale-105 hover:shadow-xl'
                    : 'bg-white/30 text-white/50 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          )}

          {/* Location Step */}
          {step === 'location' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-10 border border-white/20">
              <button
                onClick={() => setStep('age')}
                className="text-white/80 hover:text-white mb-4 flex items-center space-x-2 transition-colors"
              >
                <span>←</span>
                <span>Back</span>
              </button>

              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Where are you located?
              </h1>
              <p className="text-white/80 mb-8">
                We'll show you items available in your area
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-white font-medium mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., San Francisco"
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., California"
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-white bg-red-500/30 backdrop-blur px-4 py-3 rounded-xl mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleLocationSubmit}
                disabled={!city || !state || saving}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-200 ${
                  city && state && !saving
                    ? 'bg-white text-purple-600 hover:scale-105 hover:shadow-xl'
                    : 'bg-white/30 text-white/50 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Privacy Footer */}
        <PrivacyFooter variant="dark" className="mt-8" />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
