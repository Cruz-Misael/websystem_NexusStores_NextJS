import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A pasta que guarda este projeto tem vários outros repositórios ao lado, cada
  // um com seu package-lock.json. Sem esta linha o Turbopack elege a pasta-pai
  // como raiz do workspace e o `next dev` quebra logo no primeiro import de CSS
  // ("Can't resolve 'tailwindcss'"), porque procura node_modules lá em cima.
  turbopack: { root: path.join(__dirname) },
  // Compressão gzip/brotli nas respostas
  compress: true,
  // Não expor o header X-Powered-By (fingerprinting)
  poweredByHeader: false,
  // Melhora o tree-shaking/chunking destas libs (imports de barril → submódulos)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
    ],
  },
  // Remove console.* do bundle de produção (mantém console.error)
  compiler: {
    removeConsole: { exclude: ['error'] },
  },
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
