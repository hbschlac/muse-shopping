import { ChevronRight, Package, CreditCard, Bell, HelpCircle, MessageSquare, LogOut, Settings } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const menuSections = [
  {
    title: 'Shopping',
    items: [
      { icon: Package, label: 'Orders', href: '/profile/orders' },
      { icon: CreditCard, label: 'Payment Methods', href: '/profile/payments' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', href: '/profile/notifications' },
      { icon: Settings, label: 'Settings', href: '/profile/settings' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help Center', href: '/profile/help' },
      { icon: MessageSquare, label: 'Contact Store', href: '/profile/contact' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: LogOut, label: 'Sign Out', href: '/signout', destructive: true },
    ],
  },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <div className="bg-[var(--color-ecru)] pt-12 pb-6 px-4">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Profile</h1>

        {/* Profile Info */}
        <div className="bg-white rounded-[16px] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-[17px] font-semibold text-gray-900">Sarah Johnson</h2>
              <p className="text-[15px] text-gray-600">sarah.j@email.com</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">24</p>
              <p className="text-sm text-gray-600 mt-1">Saved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">12</p>
              <p className="text-sm text-gray-600 mt-1">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">8</p>
              <p className="text-sm text-gray-600 mt-1">Collections</p>
            </div>
          </div>
        </div>
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
                        className={`text-[15px] ${
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
