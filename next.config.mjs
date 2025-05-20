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
  },
  
  // Basic webpack config for socket.io
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'socket.io-client'];
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
  reactStrictMode: false,  // Disable for smoother development

  // Environment variables
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://localhost:3000',
  },

  // Development performance improvements
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
