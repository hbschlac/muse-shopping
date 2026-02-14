'use client';

import { useState, useEffect } from 'react';
import {
  getRetailers,
  getConnectedRetailers,
  initiateRetailerAuth,
  disconnectRetailer,
  type RetailerAuthStatus,
} from '@/lib/api/retailers';

interface Retailer {
  id: string;
  name: string;
  logo_url?: string;
  supports_oauth: boolean;
}

/**
 * Retailer Connections Component
 * Allows users to connect/disconnect their retailer accounts
 */
export default function RetailerConnections() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [connectedRetailers, setConnectedRetailers] = useState<RetailerAuthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [retailersList, connected] = await Promise.all([
        getRetailers(),
        getConnectedRetailers(),
      ]);

      setRetailers(retailersList);
      setConnectedRetailers(connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retailers');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(retailerId: string) {
    if (!confirm('Are you sure you want to disconnect this retailer account?')) {
      return;
    }

    try {
      setDisconnecting(retailerId);
      await disconnectRetailer(retailerId);
      await loadData(); // Reload data
    } catch (err) {
      alert('Failed to disconnect retailer account');
    } finally {
      setDisconnecting(null);
    }
  }

  function handleConnect(retailerId: string) {
    initiateRetailerAuth(retailerId);
  }

  function isConnected(retailerId: string): boolean {
    return connectedRetailers.some(
      (conn) => conn.retailer_id === retailerId && conn.is_connected
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your stores...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show stores the user shops at first, then all others
  const userStores = connectedRetailers.length > 0 ? connectedRetailers : [];
  const otherRetailers = retailers.filter(
    (r) => !userStores.some((us) => us.retailer_id === r.id)
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Connected Stores
        </h2>
        <p className="text-gray-600">
          Connect your retailer accounts to enable one-click checkout and order tracking
        </p>
      </div>

      {/* Stores the user shops at */}
      {userStores.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Your Stores
          </h3>
          <div className="space-y-3">
            {userStores.map((store) => {
              const connected = store.is_connected;

              return (
                <div
                  key={store.retailer_id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border-2 border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.retailer_name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-semibold text-gray-400">
                          {store.retailer_name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {store.retailer_name}
                      </h3>
                      {connected ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Account Connected
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-sm text-gray-500">
                            {(store.total_orders || 0) > 0
                              ? `${store.total_orders} order${(store.total_orders || 0) > 1 ? 's' : ''} detected`
                              : 'You shop here'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {connected ? (
                      <button
                        onClick={() => handleDisconnect(store.retailer_id)}
                        disabled={disconnecting === store.retailer_id}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {disconnecting === store.retailer_id
                          ? 'Disconnecting...'
                          : 'Disconnect'}
                      </button>
                    ) : store.supports_oauth ? (
                      <button
                        onClick={() => handleConnect(store.retailer_id)}
                        className="px-4 py-2 bg-[#F4C4B0] text-[#333333] rounded-lg text-sm font-semibold hover:bg-[#F4B69A] transition-colors"
                      >
                        Connect Account
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other available retailers */}
      {otherRetailers.length > 0 && userStores.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Add More Stores
          </h3>
          <div className="space-y-3">
            {otherRetailers.slice(0, 5).map((retailer) => (
              <div
                key={retailer.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  {retailer.logo_url ? (
                    <img
                      src={retailer.logo_url}
                      alt={retailer.name}
                      className="w-10 h-10 object-contain opacity-60"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-400">
                        {retailer.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <h3 className="text-base font-medium text-gray-700">
                    {retailer.name}
                  </h3>
                </div>
                {retailer.supports_oauth && (
                  <button
                    onClick={() => handleConnect(retailer.id)}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {userStores.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No stores connected yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Connect your favorite stores to enable one-click checkout and automatic order tracking
          </p>
          {retailers.length > 0 && (
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Popular Stores</h4>
              <div className="space-y-2">
                {retailers.slice(0, 3).map((retailer) => (
                  <div
                    key={retailer.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {retailer.logo_url ? (
                        <img
                          src={retailer.logo_url}
                          alt={retailer.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-400">
                            {retailer.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {retailer.name}
                      </span>
                    </div>
                    {retailer.supports_oauth && (
                      <button
                        onClick={() => handleConnect(retailer.id)}
                        className="px-3 py-1.5 text-xs bg-[#F4C4B0] text-[#333333] rounded-lg font-medium hover:bg-[#F4B69A] transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
