import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only set assetPrefix if we're on a custom domain (not Vercel production)
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  
  trailingSlash: false,
  
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
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  turbopack: {},
};

export default nextConfig;
