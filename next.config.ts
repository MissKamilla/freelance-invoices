import type { NextConfig } from 'next';

const publicRouteHeaders = [
  // Посилання на рахунок містить секретний токен — не віддаємо його в Referer третім сторонам (сторінка банку).
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

const nextConfig: NextConfig = {
  // Не розкриваємо фреймворк у заголовку X-Powered-By.
  poweredByHeader: false,
  // react-pdf працює лише в Node.js і не повинен бандлитися.
  serverExternalPackages: ['@react-pdf/renderer'],
  // Значок Next.js dev tools не перекриває аватар у сайдбарі.
  devIndicators: { position: 'bottom-right' },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      { source: '/i/:path*', headers: publicRouteHeaders },
      { source: '/pay/:path*', headers: publicRouteHeaders },
    ];
  },
};

export default nextConfig;
