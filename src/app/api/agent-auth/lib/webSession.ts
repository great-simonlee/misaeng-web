import { NextResponse } from 'next/server'

import { accountDeletedResponse } from '@lib/account/deletedAccount.server'
import type { FlowFail, FlowResult } from '@lib/auth/flows.server'
import { clearMisaengSession, setMisaengSession } from '@lib/auth/session.server'
import type { Translate } from '@lib/i18n/translate'

import { clearEllieoSession } from './ellieoServer'

/** Supabase-mode web sign-in: sets the misaeng_* cookies (drops any old Ellieo ones) and answers like before. */
export async function supabaseWebSessionResponse(result: FlowResult, t: Translate, extra: Record<string, unknown> = {}) {
  if (!result.ok) return webFlowFailure(result)
  const deleted = await accountDeletedResponse(result.uid, t)
  if (deleted) {
    await clearMisaengSession().catch(() => null)
    return deleted
  }
  await setMisaengSession(result.session)
  await clearEllieoSession().catch(() => null)
  return NextResponse.json({
    ok: true,
    connected: true,
    registered: result.registered,
    ...extra,
    user: {
      uid: result.uid,
      email: result.session.user.email,
      displayName: result.displayName,
      photoURL: null,
      phoneNumber: null,
    },
  })
}

export function webFlowFailure(result: FlowFail) {
  return NextResponse.json({ error: result.error, code: result.code ?? null, ...(result.extra ?? {}) }, { status: result.status })
}
