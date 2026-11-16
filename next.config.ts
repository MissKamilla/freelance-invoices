import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf працює лише в Node.js і не повинен бандлитися.
  serverExternalPackages: ['@react-pdf/renderer'],
  // Значок Next.js dev tools не перекриває аватар у сайдбарі.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
