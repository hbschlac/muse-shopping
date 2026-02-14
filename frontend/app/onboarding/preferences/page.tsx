'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PrivacyFooter from '@/components/PrivacyFooter';

export default function OnboardingPreferencesPage() {
  const router = useRouter();
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const styles = ['Casual', 'Professional', 'Athleisure', 'Bohemian', 'Minimalist', 'Trendy'];

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleContinue = () => {
    router.push('/onboarding/complete');
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] p-4">
      <div className="max-w-md mx-auto pt-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">What's your style?</h1>
        <p className="text-gray-600 mb-8">Select all that apply</p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {styles.map((style) => (
            <button
              key={style}
              onClick={() => toggleStyle(style)}
              className={`py-4 px-6 rounded-[12px] text-sm font-medium transition-all duration-150 ${
                selectedStyles.includes(style)
                  ? 'gradient-primary text-white'
                  : 'bg-white text-gray-900 border border-gray-200 hover:border-[var(--color-coral)]'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={selectedStyles.length === 0}
          className="w-full py-4 gradient-primary text-white font-semibold rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Privacy Footer */}
        <PrivacyFooter className="mt-8" />
      </div>
    </div>
  );
}
