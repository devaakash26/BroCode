/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'encrypted-tbn0.gstatic.com',
      'avatars.githubusercontent.com',
      'ui-avatars.com',
      'secure.gravatar.com',
      'neetcode.vercel.app',
      'vercel.app',
    ],
    minimumCacheTTL: 86400, // Cache images for 24 hours
  },
  
  // Basic webpack config for socket.io
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'socket.io-client'];
      
      // Fix for 'self is not defined' error
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle browser-specific modules
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add any problematic modules here
    };
    
    // Properly handle browser-only code
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /monaco-editor|socket\.io-client|framer-motion/,
      use: 'null-loader',
      include: /node_modules/,
      issuer: {
        and: [/\.(js|ts|jsx|tsx)$/],
        not: [/\.next\/server/]
      },
    });
    
    // Add production optimizations
    if (process.env.NODE_ENV === 'production') {
      // Split chunks more aggressively in production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for third-party libraries
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for code shared between pages
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },

  // Socket.io rewrites
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket.io/:path*',
      },
      {
        source: '/socket-health',
        destination: '/api/socket-health',
      },
    ];
  },

  // Production optimizations
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: false,
  compress: true,
  
  // Reduce memory usage and build time
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 15 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://neetcode.vercel.app',
    NEXT_PUBLIC_PROTOCOL: 'https',
  },

  // Build performance improvements
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Use server components when possible for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    turbotrace: {
      logLevel: 'error',
      memoryLimit: 4000
    },
    staticWorkersDuringDev: true,
  },
};

export default nextConfig;
