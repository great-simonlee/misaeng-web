import { SERVER_SUPPORT_BRAND } from '@lib/support/brand'
import { getSupportSettings, supportFeatureOn } from '@lib/support/settings.server'
import { supportJson } from '@lib/support/http.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Which support features are on (apps fall back to the old mail buttons when off). No login needed. */
export async function GET() {
  const settings = await getSupportSettings(SERVER_SUPPORT_BRAND)
  // Testers see the features before the switches go on (login optional here)
  const email = settings.testers?.length ? (await resolveAuthenticatedUser().catch(() => null))?.email : null
  return supportJson({
    housingChat: supportFeatureOn(settings, 'support.enabled', email),
    inquiries: supportFeatureOn(settings, 'inquiry.enabled', email),
    // KakaoTalk is a Misaeng (Korean) channel only
    kakaoUrl: SERVER_SUPPORT_BRAND === 'misaeng' ? process.env.NEXT_PUBLIC_KAKAO_INQUIRY_URL?.trim() || null : null,
  })
}
