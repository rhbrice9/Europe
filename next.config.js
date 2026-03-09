/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Don't expose Next.js version in response headers
  poweredByHeader: false,

  // Enable gzip/brotli compression for all responses
  compress: true,

  // Don't generate source maps in production builds (faster builds, smaller output)
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      // Long-term cache for Vercel's immutable static assets (hashed filenames)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
