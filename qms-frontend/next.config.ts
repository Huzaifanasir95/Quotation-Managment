import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@tanstack/react-query']
  },
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize bundle splitting for better performance
  webpack: (config: any, { buildId, dev, isServer, defaultLoaders, webpack }: any) => {
    // Optimize chunk splitting for heavy libraries
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate chunk for heavy libraries
          heavyLibs: {
            test: /[\\/]node_modules[\\/](tesseract\.js|xlsx|chart\.js|pdfjs-dist)[\\/]/,
            name: 'heavy-libs',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // Separate chunk for React Query
          reactQuery: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
            name: 'react-query',
            chunks: 'all',
            priority: 9,
          },
          // Separate chunk for UI libraries
          uiLibs: {
            test: /[\\/]node_modules[\\/](@heroicons|@headlessui)[\\/]/,
            name: 'ui-libs',
            chunks: 'all',
            priority: 8,
          },
        },
      };
    }

    // Analyze bundle size in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Enable static optimization
  trailingSlash: false,
};

export default nextConfig;
