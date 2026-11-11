import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Admin pages are for the site owner only. Keep them out of search engines.
export const metadata: Metadata = {
  title: 'Muse Admin',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
