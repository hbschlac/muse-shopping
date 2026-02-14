'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Store, Bell, Lock, Globe, Palette, Smartphone, Shield } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

const settingsSections = [
  {
    title: 'Account',
    items: [
      {
        icon: Store,
        label: 'Connected Stores',
        href: '/settings/retailers',
        description: 'Manage your retailer accounts',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        icon: Bell,
        label: 'Notifications',
        href: '/profile/notifications',
        description: 'Manage notification settings',
      },
      {
        icon: Globe,
        label: 'Language & Region',
        href: '/profile/settings/language',
        description: 'English (US)',
      },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      {
        icon: Lock,
        label: 'Privacy Settings',
        href: '/profile/privacy',
        description: 'Control your data and privacy',
      },
      {
        icon: Shield,
        label: 'Password',
        href: '/profile/settings/password',
        description: 'Change your password',
      },
    ],
  },
  {
    title: 'App',
    items: [
      {
        icon: Palette,
        label: 'Appearance',
        href: '/profile/settings/appearance',
        description: 'Theme and display options',
      },
      {
        icon: Smartphone,
        label: 'App Version',
        href: '#',
        description: '1.0.0',
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        </div>
      </header>

      {/* Settings Sections */}
      <div className="px-4 pt-6 space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
              {section.title}
            </h2>
            <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLink = item.href !== '#';

                const content = (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    {isLink && <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </>
                );

                const className = `flex items-center justify-between px-4 py-4 transition-colors duration-150 ${
                  isLink ? 'hover:bg-gray-50 cursor-pointer' : ''
                } ${index < section.items.length - 1 ? 'border-b border-gray-100' : ''}`;

                return isLink ? (
                  <Link key={item.label} href={item.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Account Actions
          </h2>
          <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
            <Link
              href="/profile/settings/delete-account"
              className="flex items-center justify-between px-4 py-4 hover:bg-red-50 transition-colors duration-150"
            >
              <p className="text-base font-medium text-red-600">Delete Account</p>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
