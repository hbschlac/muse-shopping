import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

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
    icon: '/icon.svg',
    apple: '/logo-m.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={beVietnamPro.variable} suppressHydrationWarning>
      <body className="antialiased text-base">
        {children}
      </body>
    </html>
  );
}
