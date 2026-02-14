'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const screens = [
  {
    text: "Welcome to Muse",
  },
  {
    text: "All your favorite stores",
  },
  {
    text: "One checkout",
  },
];

export default function OnboardingIntro() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);

  useEffect(() => {
    if (currentScreen < screens.length - 1) {
      const timer = setTimeout(() => {
        setCurrentScreen(prev => prev + 1);
      }, 2500); // 2.5 seconds per screen
      return () => clearTimeout(timer);
    } else {
      // On last screen, wait 2.5 seconds then navigate
      const timer = setTimeout(() => {
        router.push('/onboarding/start');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, router]);

  const screen = screens[currentScreen];

  const handleSkip = () => {
    router.push('/onboarding/start');
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6 relative">
      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-8 right-6 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
      >
        Skip
      </button>

      {/* Main Content */}
      <div className="max-w-lg w-full text-center animate-fade-in" key={currentScreen}>
        <h1 className="text-4xl md:text-5xl font-normal text-[var(--color-text-primary)] leading-tight">
          {screen.text}
        </h1>
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 mt-12">
        {screens.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentScreen
                ? 'w-8 bg-[var(--color-coral)]'
                : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
