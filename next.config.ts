
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ url }: { url: URL }) => {
        const workerBase = process.env.NEXT_PUBLIC_FILES_BASE_URL;
        if (!workerBase) return false;
        // Ensure the origin of the request URL matches the worker's origin.
        try {
          return url.origin === new URL(workerBase).origin;
        } catch (e) {
          return false;
        }
      },
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-files-via-worker',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
        cacheableResponse: {
          statuses: [0, 200],
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
    remotePatterns.push({
      protocol: 'https',
      hostname: workerHostname,
    });
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

     // Fix for Handlebars `require.extensions` issue with webpack
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/handlebars\//,
      loader: 'string-replace-loader',
      options: {
        search: 'require.extensions',
        replace: 'null',
      },
    });

    return config;
  },
};

export default withPWA(nextConfig);
