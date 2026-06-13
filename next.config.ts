import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compressão gzip/brotli nas respostas
  compress: true,
  // Não expor o header X-Powered-By (fingerprinting)
  poweredByHeader: false,
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
  async headers() {
    return [
      {
        // Headers de segurança em todas as rotas
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // HSTS: só tem efeito sob HTTPS (produção) — inofensivo em dev
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
