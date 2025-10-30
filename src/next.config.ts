

import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const remotePatterns: Exclude<NextConfig['images'], undefined>['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
  },
  {
    protocol: 'https' as const,
    hostname: 'picsum.photos',
  },
];

// Dynamically add the worker hostname to remotePatterns if it's set
if (process.env.NEXT_PUBLIC_FILES_BASE_URL) {
  try {
    const workerHostname = new URL(process.env.NEXT_PUBLIC_FILES_BASE_URL).hostname;
    if (workerHostname) {
      remotePatterns.push({
        protocol: 'https',
        hostname: workerHostname,
      });
    }
  } catch (error) {
    console.error("Invalid NEXT_PUBLIC_FILES_BASE_URL:", error);
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  webpack: (config: Configuration, { isServer, dev }) => {
    // This is to prevent the "Module not found: Can't resolve 'canvas'" error during build
    if (isServer) {
      if (!config.externals) {
        config.externals = [];
      }
      if (Array.isArray(config.externals)) {
        config.externals.push('canvas');
      }
    }

    return config;
  },
};

export default withPWA(nextConfig);
