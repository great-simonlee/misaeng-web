import type { Metadata } from 'next'

import Page, { generateMetadata as baseMetadata } from '../../privacy-policy/page'

/**
 * Same document as /{city}/privacy-policy, for the native app's in-app viewer:
 * SiteHeader/SiteFooter hide themselves on /app-view/ paths. Not indexed (the regular page is canonical).
 */
export async function generateMetadata(props: Parameters<typeof baseMetadata>[0]): Promise<Metadata> {
  return { ...(await baseMetadata(props)), robots: { index: false, follow: false } }
}

export default Page
