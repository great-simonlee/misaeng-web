import type { MetadataRoute } from 'next'

import { BRAND_CONFIG } from '@lib/brand'

/**
 * /robots.txt per brand.
 * - Ellieo: crawl the city pages (en + /vi), not sign-in, personal pages or the API; points to the sitemap.
 * - Misaeng: allow everything — same as before this file existed (no robots.txt = no rules).
 */
export default function robots(): MetadataRoute.Robots {
  if (BRAND_CONFIG.id !== 'ellieo') {
    return { rules: { userAgent: '*', allow: '/' } }
  }
  const privatePaths = ['/api/']
  for (const locale of BRAND_CONFIG.serviceLocales) {
    const prefix = locale === BRAND_CONFIG.serviceDefaultLocale ? '' : `/${locale}`
    privatePaths.push(`${prefix}/*/me`, `${prefix}/*/login`, `${prefix}/*/test`)
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: privatePaths },
    sitemap: `${BRAND_CONFIG.productionUrl}/sitemap.xml`,
    host: BRAND_CONFIG.productionUrl,
  }
}
