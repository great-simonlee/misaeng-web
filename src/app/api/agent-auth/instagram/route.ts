import { randomInt, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { getRequestT } from '@lib/i18n/server'
import { notifyErpInstagramVerification } from '@lib/erp/notifyInstagramVerification'
import {
  isInstagramVerificationStorageConfigured,
  listStoredInstagramVerifications,
  saveStoredInstagramVerification,
} from '@lib/supabase/instagramVerification.server'
import {
  accountSuspendedResponse,
  getSupabaseProfile,
  isSupabaseProfileConfigured,
  upsertSupabaseProfile,
} from '@lib/supabase/profile.server'
import {
  createInstagramCode,
  INSTAGRAM_CODE_TTL_MS,
  INSTAGRAM_REQUESTS_PER_DAY,
  instagramStateFromProfile,
  normalizeInstagramHandle,
} from '@lib/verification/instagram'

import { resolveAuthenticatedUser } from '../lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type InstagramBody = {
  action?: 'request' | 'sent' | 'cancel'
  handle?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 인스타그램 DM 인증 (본인).
 * GET → 내 상태. POST { action: 'request', handle } 코드 발급 · 'sent' DM 보냈어요 · 'cancel' 요청 취소.
 * 승인·반려는 ERP(ellieo-erp misaeng-admin/instagram)가 같은 요청 파일과 프로필을 고친다.
 */
export async function GET(request: Request) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const profile = await getSupabaseProfile(user.uid)
  return NextResponse.json({ instagram: instagramStateFromProfile(profile) })
}

export async function POST(request: Request) {
  const t = await getRequestT(request, 'api')
  try {
    const user = await resolveAuthenticatedUser()
    if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
    const suspended = await accountSuspendedResponse(user.uid, t)
    if (suspended) return suspended
    if (!isSupabaseProfileConfigured() || !isInstagramVerificationStorageConfigured()) {
      return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
    }

    const body = ((await request.json().catch(() => null)) || {}) as InstagramBody
    const action = body.action || 'request'
    const profile = await getSupabaseProfile(user.uid)
    const all = await listStoredInstagramVerifications()
    const mine = all.filter((item) => item.uid === user.uid)
    const open = mine.find((item) => item.status === 'pending')

    if (action === 'sent' || action === 'cancel') {
      if (!open) {
        return NextResponse.json({ error: t('verification.instagram.noRequest') }, { status: 404 })
      }
      const now = Date.now()
      if (action === 'sent') {
        await saveStoredInstagramVerification({ ...open, sentAt: open.sentAt ?? now })
        const saved = await upsertSupabaseProfile(user.uid, { instagramPendingSentAt: open.sentAt ?? now })
        return NextResponse.json({ ok: true, instagram: instagramStateFromProfile(saved) })
      }
      await saveStoredInstagramVerification({ ...open, status: 'cancelled' })
      const saved = await upsertSupabaseProfile(user.uid, {
        instagramStatus: profile?.instagramVerified ? 'approved' : 'none',
        instagramPendingHandle: null,
        instagramPendingCode: null,
        instagramPendingExpiresAt: null,
        instagramPendingSentAt: null,
      })
      return NextResponse.json({ ok: true, instagram: instagramStateFromProfile(saved) })
    }

    if (action !== 'request') {
      return NextResponse.json({ error: t('common.badRequest') }, { status: 400 })
    }

    const handle = normalizeInstagramHandle(body.handle)
    if (!handle) {
      return NextResponse.json({ error: t('verification.instagram.invalidHandle') }, { status: 400 })
    }
    if (profile?.instagramVerified && profile.instagramHandle === handle) {
      return NextResponse.json({ error: t('verification.instagram.alreadyVerified') }, { status: 409 })
    }

    const now = Date.now()
    // 한 아이디는 한 계정만: 다른 사람이 인증했거나 아직 유효한 요청을 갖고 있으면 막는다.
    const takenByOther = all.some(
      (item) =>
        item.handle === handle &&
        item.uid !== user.uid &&
        (item.status === 'approved' || (item.status === 'pending' && item.expiresAt > now)),
    )
    if (takenByOther) {
      return NextResponse.json({ error: t('verification.instagram.handleTaken') }, { status: 409 })
    }
    const today = mine.filter((item) => item.createdAt > now - DAY_MS).length
    if (today >= INSTAGRAM_REQUESTS_PER_DAY) {
      return NextResponse.json({ error: t('verification.instagram.tooManyRequests') }, { status: 429 })
    }

    // 새 코드를 받으면 예전 요청은 취소 (요청은 한 번에 하나)
    await Promise.all(
      mine
        .filter((item) => item.status === 'pending')
        .map((item) => saveStoredInstagramVerification({ ...item, status: 'cancelled' })),
    )

    const code = createInstagramCode(() => randomInt(1_000_000) / 1_000_000)
    const expiresAt = now + INSTAGRAM_CODE_TTL_MS
    const saved = await saveStoredInstagramVerification({
      id: randomUUID(),
      uid: user.uid,
      userEmail: user.email || profile?.email || '',
      userNickname: profile?.nickname?.trim() || null,
      handle,
      code,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      sentAt: null,
      reviewedByEmail: null,
      reviewedAt: null,
      rejectReasonCode: null,
      rejectReason: null,
    })
    const nextProfile = await upsertSupabaseProfile(user.uid, {
      instagramStatus: 'pending',
      instagramRequestId: saved.id,
      instagramRejectReasonCode: null,
      instagramRejectReason: null,
      instagramPendingHandle: handle,
      instagramPendingCode: code,
      instagramPendingExpiresAt: expiresAt,
      instagramPendingSentAt: null,
    })

    await notifyErpInstagramVerification({
      requestId: saved.id,
      handle,
      code,
      userEmail: saved.userEmail,
      userNickname: saved.userNickname,
    })

    return NextResponse.json({ ok: true, instagram: instagramStateFromProfile(nextProfile) })
  } catch (error) {
    return NextResponse.json(
      { error: apiErrorMessage(t, error, 'verification.instagram.requestFailed') },
      { status: 500 },
    )
  }
}
