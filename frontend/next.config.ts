import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'cdn.jsdelivr.net', 'logo.clearbit.com', 'videos.pexels.com', 'www.pexels.com'],
    unoptimized: true,
  },
};

export default nextConfig;
