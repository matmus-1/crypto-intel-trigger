/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ["@trigger.dev/sdk"],
  },
};

module.exports = nextConfig;
