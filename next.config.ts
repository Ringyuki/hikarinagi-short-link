import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
    });
    return config;
  },
};

export default nextConfig;
