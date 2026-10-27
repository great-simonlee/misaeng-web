import { NextResponse } from 'next/server'

import type { Translate } from '@lib/i18n/translate'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

/**
 * Deleted Misaeng accounts (profile status 'deleted', src/lib/account/deleteAccount.server.ts).
 * Sign-in (web + app) and every authenticated request refuse them with code ACCOUNT_DELETED.
 * Normal request auth uses the 5-minute profile cache (the deleting server clears it right away). Sign-in routes
 * (accountDeletedResponse / refuseDeletedWebSignIn: app-auth email/google/apple/refresh, web email/google) read fresh,
 * so a delete or an ERP restore made on another server instance applies at the next sign-in.
 */

export const ACCOUNT_DELETED_CODE = 'ACCOUNT_DELETED'

/**
 * Never throws: when the profile cannot be read the account is treated as not deleted.
 * `fresh`: skip the cache (sign-in); the fresh profile then replaces the cached one for later requests.
 */
export async function isAccountDeleted(
  uid: string | null | undefined,
  options: { fresh?: boolean } = {},
): Promise<boolean> {
  const id = String(uid || '').trim()
  if (!id) return false
  try {
    if (options.fresh) listProfileCache.delete(id)
    const profile = await listProfileCache.get(id, () => getSupabaseProfile(id))
    return profile?.status === 'deleted'
  } catch {
    return false
  }
}

/**
 * Sign-in check (fresh read, no cache): 403 { error, code: ACCOUNT_DELETED } when the account was deleted, else null.
 * `t` = getRequestT(request, 'api').
 */
export async function accountDeletedResponse(uid: string | null | undefined, t: Translate) {
  if (!(await isAccountDeleted(uid, { fresh: true }))) return null
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
