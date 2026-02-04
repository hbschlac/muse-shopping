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
        <p className="text-gray-500">Loading retailers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Retailer Connections
        </h2>
        <p className="text-gray-600">
          Connect your retailer accounts to sync orders, track prices, and get
          personalized recommendations.
        </p>
      </div>

      <div className="space-y-4">
        {retailers.map((retailer) => {
          const connected = isConnected(retailer.id);
          const connectionInfo = connectedRetailers.find(
            (c) => c.retailer_id === retailer.id
          );

          return (
            <div
              key={retailer.id}
              className="flex items-center justify-between p-4 bg-white rounded-[12px] shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-4">
                {retailer.logo_url ? (
                  <img
                    src={retailer.logo_url}
                    alt={retailer.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-400">
                      {retailer.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {retailer.name}
                  </h3>
                  {connected && connectionInfo ? (
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
                        Connected
                      </span>
                      {connectionInfo.scopes && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Access: {connectionInfo.scopes.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Not connected</p>
                  )}
                </div>
              </div>

              <div>
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(retailer.id)}
                    disabled={disconnecting === retailer.id}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {disconnecting === retailer.id
                      ? 'Disconnecting...'
                      : 'Disconnect'}
                  </button>
                ) : retailer.supports_oauth ? (
                  <button
                    onClick={() => handleConnect(retailer.id)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Connect
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">
                    Manual setup required
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {retailers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No retailers available yet.</p>
        </div>
      )}
    </div>
  );
}
