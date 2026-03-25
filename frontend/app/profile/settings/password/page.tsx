'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';

export default function PasswordChangePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Redirect back after success
      setTimeout(() => {
        router.push('/profile/settings');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFDFB] pb-24">
      <PageHeader title="Change Password" showBack onBack={() => router.push('/profile/settings')} />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E5DF] p-6">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              Password changed successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[#333333] mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                required
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[#333333] mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
              <p className="mt-1 text-xs text-[#6B625C]">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#333333] mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-[#F4C4B0] text-[#333333] rounded-xl font-semibold hover:bg-[#F4B69A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>

          {/* Security Tips */}
          <div className="mt-6 pt-6 border-t border-[#E9E5DF]">
            <h3 className="text-sm font-medium text-[#333333] mb-3">Password Tips</h3>
            <ul className="space-y-2 text-sm text-[#6B625C]">
              <li className="flex items-start gap-2">
                <span className="text-[#F4C4B0] mt-0.5">•</span>
                Use at least 8 characters
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#F4C4B0] mt-0.5">•</span>
                Include a mix of letters, numbers, and symbols
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#F4C4B0] mt-0.5">•</span>
                Don't reuse passwords from other sites
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
