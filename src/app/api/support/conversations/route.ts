import { getRequestT } from '@lib/i18n/server'
import { isIdentityVerified } from '@lib/community/schoolGate'
import { accountSuspendedResponse, getSupabaseProfile } from '@lib/supabase/profile.server'
import { SERVER_SUPPORT_BRAND } from '@lib/support/brand'
import { parseHousingProfile, supportErrorResponse, supportJson, toUserConversation } from '@lib/support/http.server'
import {
  listUserConversations,
  saveHousingProfile,
  startHousingConversation,
  startInquiry,
} from '@lib/support/service.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET ?kind=housing|inquiry → { items } (inquiry = 문의 + 건의). */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const kind = new URL(request.url).searchParams.get('kind')
    const kinds = kind === 'housing' ? (['housing'] as const) : kind === 'inquiry' ? (['question', 'suggestion'] as const) : (['housing', 'question', 'suggestion'] as const)
    const rows = await listUserConversations(user.uid, [...kinds], SERVER_SUPPORT_BRAND)
    return supportJson({ items: rows.map(toUserConversation) })
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}

type StartBody = {
  kind?: string
  listingId?: string | null
  message?: string
  title?: string
  profile?: unknown
  /** housing: "일주일 동안 묻지 않기" */
  skipConfirm?: boolean
  city?: string | null
}

/**
 * POST { kind: 'housing', listingId, message, profile, skipConfirm? } → 201 { conversation } (200 when an open chat about
 * the same listing continued) · POST { kind: 'question' | 'suggestion', title, message } → 201 { conversation }.
 * Housing needs school or work email verification (spec §3.2); 문의/건의 only needs a login.
 * Ellieo (ellieo.com board): housing only needs a login too, and the details form is optional.
 * The conversation brand is this server's brand (SERVER_SUPPORT_BRAND), never a body field.
 */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return supportJson({ error: t('common.loginRequired') }, 401)
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    const body = ((await request.json().catch(() => null)) ?? {}) as StartBody
    const email = user.email && !user.email.endsWith('@ellieo.user') ? user.email : null
    const startUser = { uid: user.uid, email, displayName: user.displayName }

    const brand = SERVER_SUPPORT_BRAND
    if (body.kind === 'housing') {
      const ellieo = brand === 'ellieo'
      if (!ellieo) {
        const profileRecord = await getSupabaseProfile(user.uid)
        if (!isIdentityVerified(profileRecord ?? undefined)) {
          return supportJson({ error: t('support.verifyRequired'), code: 'VERIFICATION_REQUIRED' }, 403)
        }
      }
      const profile = parseHousingProfile(body.profile, { required: !ellieo })
      if (!profile) {
        if (process.env.NODE_ENV === 'development') console.warn('[support] invalid housing profile', JSON.stringify(body.profile))
        return supportJson({ error: t('support.profileInvalid'), code: 'PROFILE_INVALID' }, 400)
      }
      const listingId = typeof body.listingId === 'string' && body.listingId.trim() ? body.listingId.trim().slice(0, 200) : null
      const result = await startHousingConversation({
        user: { ...startUser, email: email ?? profile.email ?? null },
        listingId,
        message: String(body.message ?? ''),
        profile,
        city: body.city,
        brand,
      })
      // Ellieo's optional board details never overwrite the full Misaeng app housing profile
      if (!ellieo) await saveHousingProfile(user.uid, profile, body.skipConfirm ? 7 : 0)
      return supportJson({ conversation: toUserConversation(result.conversation) }, result.created ? 201 : 200)
    }

    if (body.kind === 'question' || body.kind === 'suggestion') {
      const conversation = await startInquiry({
        user: startUser,
        kind: body.kind,
        title: String(body.title ?? ''),
        message: String(body.message ?? ''),
        brand,
      })
      return supportJson({ conversation: toUserConversation(conversation) }, 201)
    }
    return supportJson({ error: t('common.badRequest') }, 400)
  } catch (error) {
    return supportErrorResponse(t, error)
  }
}
