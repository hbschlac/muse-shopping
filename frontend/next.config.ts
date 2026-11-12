import type { NextConfig } from "next";

// Security headers on every page. Kept to headers that can't break a page:
// - frame-ancestors / X-Frame-Options: no other site can show Muse inside a
//   hidden frame and trick a shopper into tapping (clickjacking). Matters most
//   on the Face ID approval screen.
// - nosniff: browsers don't guess file types.
// - Referrer-Policy: other sites see only "muse.shopping", never full paths.
// - Permissions-Policy: Muse never uses the camera, microphone or location.
//   Passkeys (Face ID) are not listed, so they keep working.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    domains: ['images.unsplash.com', 'cdn.jsdelivr.net', 'logo.clearbit.com', 'videos.pexels.com', 'www.pexels.com'],
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
