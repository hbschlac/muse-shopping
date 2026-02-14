import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Join the Waitlist | Muse',
  description: 'Shop all your favorites, one cart',
  openGraph: {
    title: 'Shop all your favorites, one cart',
    description: 'Join the Muse waitlist',
    url: `${siteUrl}/waitlist`,
    siteName: 'Muse',
    images: [
      {
        url: `${siteUrl}/images/og-waitlist.png`,
        width: 1200,
        height: 630,
        alt: 'Muse - Shop all your favorites, one cart',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop all your favorites, one cart',
    description: 'Join the Muse waitlist',
    images: [`${siteUrl}/images/og-waitlist.png`],
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
