import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import PrivacyConsentBanner from "@/components/PrivacyConsentBanner";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Muse - All your favorite stores. One place. Personalized. Fast.",
  description: "Shop your favorite places all in one place, all at once. Personalized fashion shopping made easy.",
  icons: {
    icon: [
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={beVietnamPro.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
      </head>
      <body className="antialiased text-base">
        {children}
        <PrivacyConsentBanner />
      </body>
    </html>
  );
}
