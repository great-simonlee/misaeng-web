import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { isAnonymousBoard } from '@lib/constants/nyc'
import {
  MAX_BLOCKED_USERS,
  readBlockedUsers,
  toPublicBlockedUser,
} from '@lib/community/blocks.server'
import {
  getStoredCommunityPost,
  isCommunityStorageConfigured,
} from '@lib/supabase/community.server'
import { listStoredCommunityComments } from '@lib/supabase/communityComments.server'
import {
  getSupabaseProfile,
  upsertSupabaseProfile,
  type BlockedUserEntry,
} from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 사용자 차단 (App Store 1.2) — 내 프로필의 blockedUsers.
 * GET    → { blocks: { id, label, anonymous, createdAt }[] }  (uid는 내보내지 않음)
 * POST   { postId, commentId? } → 서버가 그 글·댓글의 작성자를 찾아 차단. { block, blocks }
 * DELETE { id } → 차단 해제. { ok, blocks }
 */

async function requireUser(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  const user = await resolveAuthenticatedUser()
  return { user, t, locale }
}

function newestFirst(list: BlockedUserEntry[]) {
  return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(toPublicBlockedUser)
}

export async function GET(request: Request) {
  const { user, t } = await requireUser(request)
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }
  try {
    const profile = await getSupabaseProfile(user.uid)
    return NextResponse.json({ blocks: newestFirst(readBlockedUsers(profile)) })
  } catch (error) {
    console.error('Community blocks list error:', error)
    return NextResponse.json(
      { blocks: [], error: apiErrorMessage(t, error, 'community.blocks.loadFailed') },
      { status: 500 },
    )
  }
}

type CreateBody = { postId?: string; commentId?: string | null }

export async function POST(request: Request) {
  const { user, t, locale } = await requireUser(request)
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }
  if (!isCommunityStorageConfigured()) {
    return NextResponse.json(
      { error: t('common.supabaseNotConfiguredLocal'), code: 'STORAGE_UNAVAILABLE' },
      { status: 503 },
    )
  }

  const payload = (await request.json().catch(() => null)) as CreateBody | null
  const postId = String(payload?.postId || '').trim()
  const commentId = String(payload?.commentId || '').trim()
  if (!postId || postId.startsWith('mock-')) {
    return NextResponse.json({ error: t('community.blocks.targetNotFound') }, { status: 404 })
  }

  try {
    const post = await getStoredCommunityPost(postId)
    if (!post) {
      return NextResponse.json({ error: t('community.blocks.targetNotFound') }, { status: 404 })
    }
    const anonymous = isAnonymousBoard(post.categoryId)

    let targetUid = ''
    let label: string | null = null
    if (commentId) {
      const comment = (await listStoredCommunityComments(postId)).find(
        (item) => item.id === commentId,
      )
      if (!comment || comment.status !== 'open') {
        return NextResponse.json({ error: t('community.blocks.targetNotFound') }, { status: 404 })
      }
      targetUid = comment.authorUid
      label = comment.authorNickname?.trim() || null
    } else {
      targetUid = post.authorUid
      label = post.authorNickname?.trim() || null
    }

    if (!targetUid) {
      // 가입 없이 남긴 글 등 작성자 계정이 없는 경우
      return NextResponse.json({ error: t('community.blocks.targetNotFound') }, { status: 404 })
    }
    if (targetUid === user.uid) {
      return NextResponse.json({ error: t('community.blocks.self') }, { status: 400 })
    }

    const profile = await getSupabaseProfile(user.uid)
    const existing = readBlockedUsers(profile)
    const already = existing.find((item) => item.uid === targetUid)
    if (already) {
      return NextResponse.json({ block: toPublicBlockedUser(already), blocks: newestFirst(existing) })
    }
    if (existing.length >= MAX_BLOCKED_USERS) {
      return NextResponse.json(
        { error: t('community.blocks.limit', { max: formatNumber(locale, MAX_BLOCKED_USERS) }) },
        { status: 400 },
      )
    }

    const now = Date.now()
    const entry: BlockedUserEntry = {
      id: `blk_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      uid: targetUid,
      label: anonymous ? null : label,
      anonymous,
      createdAt: now,
    }
    const next = [...existing, entry]
    // upsertSupabaseProfile가 listProfileCache(내 차단 목록)도 비운다
    await upsertSupabaseProfile(user.uid, { blockedUsers: next })
    return NextResponse.json({ block: toPublicBlockedUser(entry), blocks: newestFirst(next) })
  } catch (error) {
    console.error('Community block create error:', error)
    return NextResponse.json(
      { error: apiErrorMessage(t, error, 'community.blocks.failed') },
      { status: 500 },
    )
  }
}

type DeleteBody = { id?: string }

export async function DELETE(request: Request) {
  const { user, t } = await requireUser(request)
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }
  const payload = (await request.json().catch(() => null)) as DeleteBody | null
  const id =
    String(payload?.id || '').trim() ||
    String(new URL(request.url).searchParams.get('id') || '').trim()
  if (!id) {
    return NextResponse.json({ error: t('community.blocks.notFound') }, { status: 400 })
  }

  try {
    const profile = await getSupabaseProfile(user.uid)
    const existing = readBlockedUsers(profile)
    const next = existing.filter((item) => item.id !== id)
    if (next.length === existing.length) {
      return NextResponse.json({ error: t('community.blocks.notFound') }, { status: 404 })
    }
    await upsertSupabaseProfile(user.uid, { blockedUsers: next })
    return NextResponse.json({ ok: true, blocks: newestFirst(next) })
  } catch (error) {
    console.error('Community block delete error:', error)
    return NextResponse.json(
      { error: apiErrorMessage(t, error, 'community.blocks.unblockFailed') },
      { status: 500 },
    )
  }
}
