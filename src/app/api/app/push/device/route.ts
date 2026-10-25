import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { parseLocale } from '@lib/i18n/locales'
import { deletePushDevice, PushStoreError, savePushDevice } from '@lib/push/store.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_PATTERN = /^[0-9a-f]{64,200}$/i

function storeError(error: unknown) {
  const setup = error instanceof PushStoreError && error.setupRequired
  return NextResponse.json({ error: setup ? error.message : 'Push registration failed.' }, { status: setup ? 503 : 500 })
}

/** POST { token, environment: 'sandbox' | 'production', locale } — the app's APNs device token for the signed-in user. */
export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })

  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const token = String(body.token || '').trim()
  if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ error: 'Invalid device token.' }, { status: 400 })
  try {
    await savePushDevice({
      token,
      userId: user.uid,
      platform: 'ios',
      environment: body.environment === 'sandbox' ? 'sandbox' : 'production',
      locale: parseLocale(String(body.locale || '')) ?? 'ko',
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return storeError(error)
  }
}

/** DELETE { token } — on logout, so the next person on this phone does not get these notifications. */
export async function DELETE(request: Request) {
  const body = ((await request.json().catch(() => null)) || {}) as Record<string, unknown>
  const token = String(body.token || '').trim()
  if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ ok: true })
  const user = await resolveAuthenticatedUser()
  try {
    // Signed out already (token expired): the device token alone is enough to remove it.
    await deletePushDevice(token, user?.uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return storeError(error)
  }
}
