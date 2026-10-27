import { NextResponse } from 'next/server'

import type { Translate } from '@lib/i18n/translate'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

/**
 * Deleted Misaeng accounts (profile status 'deleted', src/lib/account/deleteAccount.server.ts).
 * Sign-in (web + app) and every authenticated request refuse them with code ACCOUNT_DELETED.
 * Uses the 5-minute profile cache; the deleting server clears it right away (upsertSupabaseProfile).
 */

export const ACCOUNT_DELETED_CODE = 'ACCOUNT_DELETED'

/** Never throws: when the profile cannot be read the account is treated as not deleted. */
export async function isAccountDeleted(uid: string | null | undefined): Promise<boolean> {
  const id = String(uid || '').trim()
  if (!id) return false
  try {
    const profile = await listProfileCache.get(id, () => getSupabaseProfile(id))
    return profile?.status === 'deleted'
  } catch {
    return false
  }
}

/** 403 { error, code: ACCOUNT_DELETED } when the account was deleted, else null. `t` = getRequestT(request, 'api'). */
export async function accountDeletedResponse(uid: string | null | undefined, t: Translate) {
  if (!(await isAccountDeleted(uid))) return null
  return NextResponse.json({ error: t('account.deleted'), code: ACCOUNT_DELETED_CODE }, { status: 403 })
}

/**
 * Web sign-in (cookie session) of a deleted account: clears the cookies just set and answers 403 ACCOUNT_DELETED.
 * Null when the account is fine. Pass the uid of the signed-in user.
 */
export async function refuseDeletedWebSignIn(uid: string | null | undefined, t: Translate) {
  const response = await accountDeletedResponse(uid, t)
  if (!response) return null
  const { clearEllieoSession } = await import('@/app/api/agent-auth/lib/ellieoServer')
  await clearEllieoSession().catch(() => undefined)
  return response
}
