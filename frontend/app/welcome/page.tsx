import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="app-hero welcome-cream-gradient">
      <div className="app-hero__grain" />
      <div className="app-hero__content">
        {/* Logo */}
        <div className="text-center mb-6">
        <div className="flex justify-center mb-6">
          <img src="/muse-wordmark.svg" alt="Muse" className="h-96" />
        </div>
        <p className="text-lg text-gray-600 font-light">
          Shop all your favorites in one place
        </p>
      </div>

      {/* Auth Options */}
      <div className="w-full max-w-sm space-y-4">
        {/* Continue with Apple */}
        <Link
          href="/welcome/email"
          className="block w-full h-14 bg-gray-900/20 backdrop-blur-md text-gray-900 rounded-[12px] flex items-center justify-center font-medium border border-gray-900/10 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-900/30 active:scale-[0.98] cursor-pointer shadow-subtle"
        >
          Continue with Apple
        </Link>

        {/* Continue with Google */}
        <Link
          href="/welcome/email"
          className="block w-full h-14 bg-white/40 backdrop-blur-md text-gray-900 rounded-[12px] flex items-center justify-center font-medium border border-gray-900/10 transition-all duration-150 hover:scale-[1.02] hover:bg-white/60 active:scale-[0.98] cursor-pointer shadow-subtle"
        >
          Continue with Google
        </Link>

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

      {/* Spacing */}
      <div className="h-20" />
      </div>
    </div>
  );
}
