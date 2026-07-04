/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    return [
      {
        source: '/api/pages-visibility',
        destination: 'http://127.0.0.1:3060/api/internal/pages-visibility',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
