'use client';

import { ChevronLeft, ChevronRight, Search, MessageCircle, FileText, Shield, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

const helpTopics = [
  {
    icon: FileText,
    title: 'Getting Started',
    description: 'Learn the basics of using Muse',
    href: '/help/getting-started',
  },
  {
    icon: Shield,
    title: 'Account & Security',
    description: 'Manage your account and privacy settings',
    href: '/help/account',
  },
  {
    icon: MessageCircle,
    title: 'Orders & Shipping',
    description: 'Track orders and understand shipping policies',
    href: '/help/orders',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Frequently asked questions',
    href: '/help/faq',
  },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Help Center</h1>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Help Topics */}
      <div className="px-4 pb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          Browse Topics
        </h2>
        <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
          {helpTopics.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.title}
                href={topic.href}
                className={`flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors ${
                  index < helpTopics.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">{topic.title}</p>
                    <p className="text-sm text-gray-600">{topic.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Contact Support */}
      <div className="px-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          Need More Help?
        </h2>
        <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">
          <Link
            href="/profile/contact"
            className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">Contact Support</p>
                <p className="text-sm text-gray-600">We're here to help</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
