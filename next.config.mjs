import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Imagens geradas pela Nanobana API
        protocol: 'https',
        hostname: 'api.nanobana.ai',
      },
      {
        // Imagens salvas no Supabase Storage
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        // CDN externo genérico para notícias
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Aumenta timeout para geração de imagens em paralelo
  experimental: {
    serverComponentsExternalPackages: ['cheerio'],
  },
}

export default withPWA(nextConfig);
