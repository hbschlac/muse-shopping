'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${API_BASE_URL}/users/delete-account`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear local storage and redirect to home
      localStorage.clear();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFDFB] pb-24">
      <PageHeader title="Delete Account" showBack onBack={() => router.push('/profile/settings')} />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#333333] mb-3">
              Delete Your Account
            </h2>
            <p className="text-[#6B625C]">
              This action is permanent and cannot be undone.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-red-900 mb-2">What will be deleted:</h3>
            <ul className="space-y-1 text-sm text-red-800">
              <li className="flex items-start gap-2">
                <span>•</span>
                Your profile and account information
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                Your saved items and preferences
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                Your order history and tracking
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                All connected store accounts
              </li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-[#333333] mb-2">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-[#333333]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/profile/settings')}
                className="flex-1 px-6 py-3 border border-[#E9E5DF] text-[#333333] rounded-xl font-medium hover:bg-[#F4EFE7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'DELETE'}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
