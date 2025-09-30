/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // This is to prevent the "Module not found: Can't resolve 'canvas'" error during build
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;
