import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;
