
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
        return url.origin === workerBase;
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


const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'files.yourdomain.com', // Add your worker domain here
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
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

    // This is to prevent the "Module not found: Can't resolve 'fs'" error from pdf-parse during build
    if (!isServer) {
        config.resolve.fallback = {
            ...(config.resolve.fallback || {}),
            "fs": false,
            "child_process": false,
            "net": false,
            "tls": false,
        };
    }
    
    // Add rule to handle pdf-parse specifically
    config.module?.rules?.push({
      test: /node_modules\/pdf-parse\/lib\/pdf-parse\.js/,
      loader: 'string-replace-loader',
      options: {
        search: "require('pdf.js/lib/pdf.js')",
        replace: "require('pdfjs-dist/legacy/build/pdf.js')"
      }
    });

    return config;
  },
};

export default withPWA(nextConfig);
