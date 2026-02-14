'use client';

import Link from 'next/link';
import { useState } from 'react';
import MuseLogo from '@/components/MuseLogo';

interface PageHeaderProps {
  showSettings?: boolean;
  rightContent?: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  backHref?: string;
}

export default function PageHeader({
  showSettings = false,
  rightContent,
  title,
  showBack = false,
  onBack,
  backHref = '/home',
}: PageHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const backControl = showBack ? (
    onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        aria-label="Go back"
      >
        <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    ) : (
      <Link
        href={backHref}
        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        aria-label="Go back"
      >
        <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
    )
  ) : null;

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-ecru)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          {backControl}
          <Link href="/home" className="hover:opacity-80 transition-opacity shrink-0">
            <MuseLogo variant="wordmark" style="gradient" className="h-16" />
          </Link>
          {title ? <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1> : null}
        </div>

        <div className="flex items-center gap-3">
          {rightContent || (
            <>
              <Link
                href="/cart"
                className="p-2 hover:bg-white/50 rounded-lg transition-colors relative"
                aria-label="Shopping Cart"
              >
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </Link>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  aria-label="Menu"
                >
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                {showMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-[12px] shadow-lg py-2 z-40">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-gray-900 hover:bg-white/50 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/feedback"
                      className="block px-4 py-2 text-gray-900 hover:bg-white/50 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      Feedback
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {showSettings && (
            <Link
              href="/settings"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
