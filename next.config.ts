
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import WorkboxPlugin from 'workbox-webpack-plugin';

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

    // Generate service worker in production
    if (!isServer && !dev) {
        config.plugins.push(
            new WorkboxPlugin.GenerateSW({
                clientsClaim: true,
                skipWaiting: true,
                swDest: 'sw.js',
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.hostname === 'res.cloudinary.com',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cloudinary-images',
                            expiration: {
                                maxEntries: 60,
                                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: ({ request }) => request.destination === 'document' || request.destination === 'script' || request.destination === 'style',
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'pages-assets',
                        },
                    },
                ],
            })
        );
    }

    return config;
  },
};

export default nextConfig;
