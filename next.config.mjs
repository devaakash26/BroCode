/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'encrypted-tbn0.gstatic.com' },
      { hostname: 'avatars.githubusercontent.com' },
      { hostname: 'ui-avatars.com' },
      { hostname: 'secure.gravatar.com' },
      { hostname: 'neetcode.vercel.app' },
      { hostname: 'vercel.app' },
    ],
  },
  
  experimental: {
    serverComponentsExternalPackages: [
      'socket.io-client',
      'framer-motion',
      'monaco-editor'
    ],
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'socket.io-client'];
    }
    return config;
  },

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

  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
