import { getSupportSettings } from '@lib/support/settings.server'
import { supportJson } from '@lib/support/http.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Which support features are on (apps fall back to the old mail buttons when off). No login needed. */
export async function GET() {
  const settings = await getSupportSettings()
  return supportJson({
    housingChat: Boolean(settings['support.enabled']),
    inquiries: Boolean(settings['inquiry.enabled']),
    kakaoUrl: process.env.NEXT_PUBLIC_KAKAO_INQUIRY_URL?.trim() || null,
  })
}
