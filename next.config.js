/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedDevOrigins: [
      "http://localhost:3000",
      "https://3000-firebase-medsphere-1758790904275.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev",
    ],
  },
};

module.exports = nextConfig;
