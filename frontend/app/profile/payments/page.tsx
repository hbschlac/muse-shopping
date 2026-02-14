'use client';

import { useState } from 'react';
import { ChevronLeft, CreditCard, Plus } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function PaymentMethodsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Payment Methods</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-4 mb-6">
          <p className="text-sm text-blue-900">
            Payment methods are managed separately for each retailer during checkout. You can save payment methods when making a purchase.
          </p>
        </div>

        {/* Saved Cards Section */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Saved Cards
          </h2>

          {/* Empty State */}
          <div className="bg-white rounded-[16px] shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved payment methods</h3>
            <p className="text-sm text-gray-600 mb-6">
              Save payment methods during checkout for faster purchases next time
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-gray-50 rounded-[16px] p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>During checkout, choose to save your payment method</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Your payment details are securely stored by the retailer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Use saved cards for one-click checkout on future orders</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
