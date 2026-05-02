import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cnntxzjbjmxmcxndauob.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/logos/**',
      },
    ],
  },
};

export default nextConfig;
