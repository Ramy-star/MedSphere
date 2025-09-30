// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    }
};

/** @type {import('next-pwa').PWAConfig} */
const pwaConfig = {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
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
            },
        },
        {
            urlPattern: /^https:\/\/medsphere\.roumio777\.workers\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'file-cache',
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
            },
        },
        {
            urlPattern: ({ url }) => {
                return url.pathname.startsWith('/_next/static');
            },
            handler: 'CacheFirst',
            options: {
                cacheName: 'next-static',
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
            },
        },
    ],
}


// @ts-ignore - next-pwa is not updated for Next 14 yet
import withPWA from 'next-pwa';

export default withPWA(pwaConfig)(nextConfig);
