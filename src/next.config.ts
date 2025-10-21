
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // This rule will match both direct Cloudinary URLs and URLs proxied through the worker.
      // It looks for /image/upload/, /video/upload/, or /raw/upload/ which is common
      // to both URL structures.
      urlPattern: /\/(image|video|raw)\/upload\//i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-assets',
        expiration: {
          maxEntries: 200, // Increased entries
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200], // 0 for opaque responses (cross-origin)
        },
      },
    },
  ],
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
