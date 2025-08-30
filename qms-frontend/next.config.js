/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1',
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
