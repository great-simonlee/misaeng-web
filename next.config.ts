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
  // 두 브랜드 개발 서버를 동시에 띄울 때 빌드 폴더가 겹치지 않게 (npm run dev:ellieo)
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
