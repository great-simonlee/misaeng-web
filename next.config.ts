import type { NextConfig } from 'next'

function supabaseImagePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return []
  try {
    const hostname = new URL(raw).hostname
    return [
      {
        protocol: 'https' as const,
        hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      ...supabaseImagePattern(),
    ],
  },
}

export default nextConfig
