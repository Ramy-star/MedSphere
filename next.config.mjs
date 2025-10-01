/** @type {import('next').NextConfig} */

import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import createPWA from 'next-pwa';

const withPWA = createPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: ({ url }) => {
        return url.hostname === 'medsphere.roumio777.workers.dev';
      },
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /\.(?:png|gif|jpg|jpeg|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
      },
    },
  ],
});


const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'medsphere.roumio777.workers.dev',
      }
    ],
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
