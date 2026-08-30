import type { NextRequest } from 'next/server'

export function getClientIp(request: Request | NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 128)
  }
  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for')
  return realIp?.trim().slice(0, 128) || null
}

export function getClientUserAgent(request: Request | NextRequest): string | null {
  return request.headers.get('user-agent')?.trim().slice(0, 512) || null
}

export function getAcceptLanguage(request: Request | NextRequest): string | null {
  return request.headers.get('accept-language')
}
