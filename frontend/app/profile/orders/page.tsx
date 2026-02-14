'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Package, MapPin, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { api } from '@/lib/api/client';

interface Order {
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  storeName: string;
  storeLogo?: string;
  items: Array<{
    name: string;
    brandName?: string;
    quantity: number;
    priceCents: number;
    imageUrl?: string;
  }>;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
  shipped: { label: 'Shipped', color: 'text-purple-600', bg: 'bg-purple-50', icon: MapPin },
  delivered: { label: 'Delivered', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: Package },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.get('/orders', { requiresAuth: true });
      setOrders(response.data?.orders || response.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          </div>
        </header>
        <div className="px-4 pt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[16px] p-4 shadow-sm">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || orders.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-600 text-center mb-8">
            When you make a purchase, it will appear here.
          </p>
          <Link
            href="/discover"
            className="px-6 py-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] hover:shadow-lg transition-shadow"
          >
            Start Shopping
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        </div>
      </header>

      {/* Orders List */}
      <div className="px-4 pt-6 space-y-4">
        {orders.map((order) => {
          const config = statusConfig[order.status];
          const StatusIcon = config.icon;

          return (
            <Link
              key={order.orderNumber}
              href={`/profile/orders/${order.orderNumber}`}
              className="block bg-white rounded-[16px] shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Order Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {order.storeLogo && (
                    <img src={order.storeLogo} alt={order.storeName} className="h-5 object-contain" />
                  )}
                  <span className="font-medium text-gray-900">{order.storeName}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 ${config.bg} rounded-full`}>
                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-4">
                <div className="flex items-start gap-4 mb-4">
                  {/* First Item Image */}
                  {order.items[0]?.imageUrl && (
                    <div className="w-20 h-20 rounded-[12px] overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={order.items[0].imageUrl}
                        alt={order.items[0].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">Order #{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${(order.totalCents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Tracking Info */}
                {order.trackingNumber && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>Tracking: {order.trackingNumber}</span>
                    </div>
                    {order.estimatedDelivery && (
                      <p className="text-sm text-gray-600 mt-1 ml-6">
                        Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
