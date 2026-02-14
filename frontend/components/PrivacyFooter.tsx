import Link from 'next/link';

interface PrivacyFooterProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export default function PrivacyFooter({ variant = 'light', className = '' }: PrivacyFooterProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`text-center ${className}`}>
      <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-500'}`}>
        <Link
          href="/profile/privacy"
          className={`${isDark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-150 underline`}
        >
          Privacy Policy
        </Link>
        {' · '}
        <Link
          href="/terms"
          className={`${isDark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors duration-150 underline`}
        >
          Terms of Service
        </Link>
      </p>
    </div>
  );
}
