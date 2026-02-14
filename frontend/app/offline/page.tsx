'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[[var(--color-ecru)]] px-4">
      <div className="text-center">
        <div className="mb-8">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            className="mx-auto"
          >
            <circle cx="60" cy="60" r="50" fill="#F4A785" opacity="0.2" />
            <path
              d="M60 30v20M60 70v20M30 60h20M70 60h20"
              stroke="#F4A785"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1F1F1F] mb-4">
          You're Offline
        </h1>
        <p className="text-[#737373] mb-8 max-w-md">
          It looks like you've lost your internet connection. Don't worry, we'll be here when you're back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-[#F4A785] to-[#8EC5FF] text-white px-8 py-3 rounded-full font-medium hover:shadow-lg transition-shadow"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
