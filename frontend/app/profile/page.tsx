'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Package, CreditCard, Bell, HelpCircle, MessageSquare, LogOut, Settings, Shield } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { api } from '@/lib/api/client';

const menuSections = [
  {
    title: 'Shopping',
    items: [
      { icon: Package, label: 'Orders', href: '/profile/orders', destructive: false },
      { icon: CreditCard, label: 'Payment Methods', href: '/profile/payments', destructive: false },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', href: '/profile/notifications', destructive: false },
      { icon: Shield, label: 'Privacy', href: '/profile/privacy', destructive: false },
      { icon: Settings, label: 'Settings', href: '/profile/settings', destructive: false },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', href: '/profile/help', destructive: false },
      { icon: MessageSquare, label: 'Contact Store', href: '/profile/contact', destructive: false },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: LogOut, label: 'Sign Out', href: '/signout', destructive: true },
    ],
  },
];

interface UserProfile {
  user: {
    id: number;
    email: string;
    username: string | null;
    full_name: string | null;
    profile_image_url: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  profile: {
    id: number;
    user_id: number;
    bio: string | null;
    location: string | null;
    [key: string]: any;
  };
  personalization?: any;
}

interface ProfileStats {
  saved: number;
  orders: number;
  collections: number;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ saved: 0, orders: 0, collections: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        // Fetch user profile
        const profileResponse = await api.get<any>('/users/me', { requiresAuth: true });

        if (profileResponse.success && profileResponse.data) {
          setUserProfile(profileResponse.data);
        } else {
          setUserProfile(profileResponse as any);
        }

        // Fetch stats in parallel
        const [favoritesResponse, ordersResponse, collectionsResponse] = await Promise.all([
          api.get<any>('/items/favorites', { requiresAuth: true }).catch(() => ({ items: [] })),
          api.get<any>('/orders', { requiresAuth: true }).catch(() => ({ data: { totalOrders: 0 } })),
          api.get<any>('/collections', { requiresAuth: true }).catch(() => ({ data: { total: 0 } }))
        ]);

        setStats({
          saved: favoritesResponse.items?.length || favoritesResponse.data?.items?.length || 0,
          orders: ordersResponse.data?.totalOrders || ordersResponse.totalOrders || 0,
          collections: collectionsResponse.data?.total || collectionsResponse.total || 0
        });
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Profile" />
        <div className="bg-[var(--color-ecru)] pb-6 px-4">
          <div className="bg-white rounded-[16px] p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !userProfile) {
    // Redirect to welcome page if not authenticated
    if (typeof window !== 'undefined' && error?.includes('token')) {
      window.location.href = '/welcome';
      return null;
    }

    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Profile" />
        <div className="bg-[var(--color-ecru)] pb-6 px-4">
          <div className="bg-white rounded-[16px] p-6 shadow-sm text-center py-8">
            <p className="text-gray-600 mb-4">You need to sign in to view your profile.</p>
            <a
              href="/welcome"
              className="inline-block px-6 py-2 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </a>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const displayName = userProfile.user.full_name || userProfile.user.username || 'User';
  const displayEmail = userProfile.user.email;
  const profileImage = userProfile.user.profile_image_url;

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      <PageHeader title="Profile" />
      {/* Profile Content */}
      <div className="bg-[var(--color-ecru)] pb-6 px-4">

        {/* Profile Info */}
        <div className="bg-white rounded-[16px] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {profileImage ? (
              <img
                src={profileImage}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              <p className="text-base text-gray-600">{displayEmail}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{stats.saved}</p>
              <p className="text-sm text-gray-600 mt-1">Saved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{stats.orders}</p>
              <p className="text-sm text-gray-600 mt-1">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{stats.collections}</p>
              <p className="text-sm text-gray-600 mt-1">Collections</p>
            </div>
          </div>
        </div>

        {/* Personalization Insights */}
        {userProfile.personalization && userProfile.personalization.styleProfile && (
          <div className="bg-white rounded-[16px] p-6 shadow-sm mt-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Your Shopping Style</h3>

            {/* Style Confidence */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Profile Strength</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(Number(userProfile.personalization.styleProfile.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-coral)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Number(userProfile.personalization.styleProfile.confidence || 0) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Based on {userProfile.personalization.styleProfile.totalEvents} interactions
              </p>
            </div>

            {/* Top Categories */}
            {userProfile.personalization.styleProfile.topCategories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Favorite Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {userProfile.personalization.styleProfile.topCategories.slice(0, 5).map((cat: any) => (
                    <span
                      key={cat.name}
                      className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-sm capitalize"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Colors */}
            {userProfile.personalization.styleProfile.topColors.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Color Preferences</h4>
                <div className="flex flex-wrap gap-2">
                  {userProfile.personalization.styleProfile.topColors.slice(0, 5).map((color: any) => (
                    <span
                      key={color.name}
                      className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-sm capitalize"
                    >
                      {color.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price Preference */}
            {userProfile.personalization.styleProfile.pricePreference && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Price Range</h4>
                <p className="text-sm text-gray-600 capitalize">
                  {userProfile.personalization.styleProfile.pricePreference.replace('_', ' ')}
                </p>
              </div>
            )}

            {/* Engagement Metrics */}
            {userProfile.personalization.metrics && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Shopping Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {userProfile.personalization.metrics.sessionsCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {userProfile.personalization.metrics.productsViewed}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Products Viewed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {userProfile.personalization.metrics.itemsAddedToCart}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Added to Cart</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(userProfile.personalization.metrics.avgSessionDuration / 60)}m
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Avg Session</p>
                  </div>
                </div>
              </div>
            )}

            {/* Segments */}
            {userProfile.personalization.segments && userProfile.personalization.segments.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Shopper Type</h4>
                <div className="space-y-2">
                  {userProfile.personalization.segments.map((segment: any) => (
                    <div key={segment.name} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{segment.name}</p>
                        <p className="text-xs text-gray-500">{segment.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(parseFloat(segment.score) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Menu Sections */}
      <div className="px-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors duration-150 ${
                      index < section.items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 ${
                          item.destructive ? 'text-red-500' : 'text-gray-600'
                        }`}
                      />
                      <span
                        className={`text-base ${
                          item.destructive ? 'text-red-500 font-medium' : 'text-gray-900'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* App Version */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-400">Version 1.0.0</p>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
