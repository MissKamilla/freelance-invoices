import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf працює лише в Node.js і не повинен бандлитися.
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
