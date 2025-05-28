import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('_http_common');
    }
    return config;
  },
};

export default nextConfig;
