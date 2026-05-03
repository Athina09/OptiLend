const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  webpack: (config) => {
    // Legacy imports + stale CI: map old monorepo alias to bundled client code.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@loan-recommendation-layer': path.resolve(__dirname, 'lib/loan-recommendation/index.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;
