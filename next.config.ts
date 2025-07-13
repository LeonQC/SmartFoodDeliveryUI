import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiBase}/:path*`,
      },
      {
        source: '/api/profile',
        destination: `${apiBase}/profile`,
      },
      {
        source: '/api/images/:path*',
        destination: `${apiBase}/images/:path*`,
      },
      {
        source: '/api/:group(client|merchant|rider)/:path*',
        destination: `${apiBase}/:group/:path*`,
      },
    ]
  },
}

export default nextConfig
