'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

const notificationSettings = [
  {
    id: 'order_updates',
    title: 'Order Updates',
    description: 'Get notified about order status changes and deliveries',
    enabled: true,
  },
  {
    id: 'price_drops',
    title: 'Price Drops',
    description: 'Alerts when items in your favorites go on sale',
    enabled: true,
  },
  {
    id: 'new_arrivals',
    title: 'New Arrivals',
    description: 'Notifications about new products from your favorite brands',
    enabled: false,
  },
  {
    id: 'recommendations',
    title: 'Personalized Recommendations',
    description: 'Product suggestions based on your style preferences',
    enabled: true,
  },
  {
    id: 'restocks',
    title: 'Restock Alerts',
    description: 'Get notified when out-of-stock items are back',
    enabled: false,
  },
  {
    id: 'promotions',
    title: 'Promotions & Offers',
    description: 'Special deals and exclusive offers',
    enabled: false,
  },
];

export default function NotificationsPage() {
  const [settings, setSettings] = useState(notificationSettings);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Detect if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    setIsPWA(isStandalone);
  }, []);

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const openSystemSettings = () => {
    // For iOS, we can't directly open Settings, but we can provide instructions
    alert('To manage notifications:\n\n1. Open iPhone Settings\n2. Scroll down and tap "Muse"\n3. Tap "Notifications"\n4. Toggle notification preferences');
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-6">
        {/* PWA System Settings Link */}
        {isPWA && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">System Notifications</p>
                <p className="text-xs text-blue-800 mb-2">
                  For push notifications, you'll need to enable them in your device settings
                </p>
                <button
                  onClick={openSystemSettings}
                  className="text-xs font-medium text-blue-600 underline"
                >
                  View Instructions
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
          {settings.map((setting, index) => (
            <div
              key={setting.id}
              className={`flex items-center justify-between px-4 py-4 ${
                index < settings.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex-1 pr-4">
                <p className="text-base font-medium text-gray-900 mb-1">{setting.title}</p>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              <button
                onClick={() => toggleSetting(setting.id)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  setting.enabled ? 'bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-blue)]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    setting.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-gray-50 rounded-[16px] p-4">
          <p className="text-sm text-gray-600">
            You can change these settings anytime. Notification preferences are synced across all your devices.
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
