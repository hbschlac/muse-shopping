'use client';

import { useState, useEffect } from 'react';
import { Shield, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface ConsentPreferences {
  data_collection: boolean;
  personalization: boolean;
  marketing: boolean;
  analytics: boolean;
  third_party_sharing: boolean;
}

export default function PrivacySettingsPage() {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    data_collection: false,
    personalization: false,
    marketing: false,
    analytics: false,
    third_party_sharing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // First check localStorage
      const stored = localStorage.getItem('privacy_preferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/shopper/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        localStorage.setItem('privacy_preferences', JSON.stringify(preferences));
        setMessage({ type: 'success', text: 'Privacy preferences saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/shopper/data/export', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Download as JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `muse_data_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: 'Your data has been exported' });
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'An error occurred during export' });
    }
  };

  const deleteData = async () => {
    try {
      const response = await fetch('/api/shopper/data/delete', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Data deletion request submitted. Your data will be anonymized within 30 days.',
        });
        setShowDeleteConfirm(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to submit deletion request' });
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage({ type: 'error', text: 'An error occurred during deletion' });
    }
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-12 pb-4 px-4">
          <h1 className="text-lg font-semibold text-gray-900">Privacy Settings</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader title="Privacy Settings" showBack onBack={() => window.history.back()} />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Privacy Preferences */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Privacy Preferences</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Control how we collect and use your data. Changes are saved immediately.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Data Collection */}
            <div className="flex items-start justify-between p-6">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Data Collection</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Track your browsing activity to improve your experience and provide better
                  recommendations.
                </p>
              </div>
              <div className="ml-6 flex items-center">
                <button
                  onClick={() => togglePreference('data_collection')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.data_collection ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.data_collection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Personalization */}
            <div className="flex items-start justify-between p-6">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Personalization</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Use your data to personalize product recommendations and content just for you.
                </p>
              </div>
              <div className="ml-6 flex items-center">
                <button
                  onClick={() => togglePreference('personalization')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.personalization ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.personalization ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between p-6">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Analytics</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Help us understand how you use our site to improve overall performance.
                </p>
              </div>
              <div className="ml-6 flex items-center">
                <button
                  onClick={() => togglePreference('analytics')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.analytics ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between p-6">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Marketing Communications</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Receive personalized offers, promotions, and product updates.
                </p>
              </div>
              <div className="ml-6 flex items-center">
                <button
                  onClick={() => togglePreference('marketing')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.marketing ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Third Party Sharing */}
            <div className="flex items-start justify-between p-6">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Third-Party Sharing</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Share your data with our trusted partners for enhanced services.
                </p>
              </div>
              <div className="ml-6 flex items-center">
                <button
                  onClick={() => togglePreference('third_party_sharing')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.third_party_sharing ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.third_party_sharing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-6">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="w-full rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="mt-6 rounded-lg bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
            <p className="mt-2 text-sm text-gray-600">
              Exercise your rights under GDPR and other privacy regulations.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {/* Export Data */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Download className="mt-1 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Export Your Data</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Download a copy of all your personal data in JSON format.
                  </p>
                  <button
                    onClick={exportData}
                    className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Download Data
                  </button>
                </div>
              </div>
            </div>

            {/* Delete Data */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Trash2 className="mt-1 h-5 w-5 text-red-400" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Delete Your Data</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Permanently delete your account and all associated data. This action cannot
                    be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Request Data Deletion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <a href="/privacy" className="underline hover:text-gray-900">
            Privacy Policy
          </a>
          {' · '}
          <a href="/terms" className="underline hover:text-gray-900">
            Terms of Service
          </a>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Your Data?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete your account and all associated data. Your data will be
              anonymized within 30 days. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={deleteData}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Yes, Delete My Data
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
