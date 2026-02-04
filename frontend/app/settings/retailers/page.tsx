import RetailerConnections from '@/components/RetailerConnections';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function RetailerSettingsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] pt-3 pb-4 px-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            Retailer Accounts
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto">
        <RetailerConnections />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
