/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: ['localhost'],
    },
    env: {
      CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: process.env.BACKEND_URL
            ? `${process.env.BACKEND_URL}/api/:path*`
            : 'http://localhost:5000/api/:path*',
        },
      ]
    },
  }
  
  module.exports = nextConfig