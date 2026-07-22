import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Critical: force absolute URLs for all assets
  assetPrefix: process.env.NEXT_PUBLIC_APP_URL || '',
  
  trailingSlash: false,
  
  // Updated: use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ngrok-free.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
  
  // Ignore TypeScript errors during build (for testing)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Turbopack config (empty object to silence the warning)
  turbopack: {},
};

export default nextConfig;
