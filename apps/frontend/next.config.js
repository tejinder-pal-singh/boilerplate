/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@enterprise/shared"],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;