import { BRAND_CONFIG } from '@lib/brand'

/**
 * Where Stripe sends the member back (Checkout success / cancel, billing portal): the page's own origin when it is
 * the site or a local dev server, otherwise the configured site URL (never an arbitrary Origin header).
 */
export function premiumReturnOrigin(request: Request): string {
  const site = BRAND_CONFIG.siteUrl.replace(/\/$/, '')
  const origin = request.headers.get('origin')?.replace(/\/$/, '')
  if (!origin) return site
  if (origin === site || origin === site.replace('://', '://www.')) return origin
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return site
}
