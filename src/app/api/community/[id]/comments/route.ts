import { NextResponse } from 'next/server'

import { apiErrorMessage } from '@lib/i18n/apiError'
import { formatNumber } from '@lib/i18n/format'
import { getRequestLocale, getRequestT, getT } from '@lib/i18n/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import {
  sanitizeAnonymousCommunityComment, hideCommentAuthorEmail,
} from '@lib/community/anonymous'
import {
  isIdentityVerified,
  SCHOOL_VERIFY_REQUIRED_CODE,
} from '@lib/community/schoolGate'
import { getMockCommunityPost } from '@lib/constants/communityMock'
import { listMockCommunityComments } from '@lib/constants/communityCommentsMock'
import { isAnonymousBoard } from '@lib/constants/nyc'
import { notifyUsers, previewText } from '@lib/push/notify.server'
import {
  getStoredCommunityPost,
  isCommunityStorageConfigured,
} from '@lib/supabase/community.server'
import {
  isCommunityCommentStorageConfigured,
  listStoredCommunityComments,
  saveStoredCommunityComments,
} from '@lib/supabase/communityComments.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'
import { listProfileCache } from '@lib/supabase/listCache.server'
import { resolveCommunityNickname, sanitizeCommunityNickname } from '@lib/community/author'
import type { CommunityComment } from '@/types/nyc'
import { localizeComments } from '@lib/translations/localize.server'
import { getViewerBlockedUids, withoutBlockedAuthors } from '@lib/community/blocks.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function resolvePostCategoryId(postId: string): Promise<string | null> {
  if (postId.startsWith('mock-')) {
    return getMockCommunityPost(postId)?.categoryId ?? null
  }
  if (!isCommunityStorageConfigured()) return null
  const post = await getStoredCommunityPost(postId)
  return post?.categoryId ?? null
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: postId } = await context.params
    const categoryId = await resolvePostCategoryId(postId)
    const isAnonymous = categoryId ? isAnonymousBoard(categoryId) : false
    const user = await resolveAuthenticatedUser()
    const stored = isCommunityCommentStorageConfigured()
      ? await listStoredCommunityComments(postId)
      : []
    const blocked = await getViewerBlockedUids(user?.uid)
    let comments = withoutBlockedAuthors(
      stored.length > 0 ? stored : listMockCommunityComments(postId),
      blocked,
    )

    if (stored.length > 0 && !isAnonymous) {
      const enriched = await enrichCommentAuthors(stored)
      const changed = enriched.some(
        (item, index) =>
          item.authorPhotoURL !== stored[index]?.authorPhotoURL ||
          item.authorNickname !== stored[index]?.authorNickname,
      )
      if (changed) {
        try {
          // 저장은 항상 전체 목록으로 (보는 사람 기준으로 거른 목록을 저장하면 안 됨)
          await saveStoredCommunityComments(postId, enriched)
        } catch {
          // 표시만 보강
        }
      }
      comments = withoutBlockedAuthors(enriched, blocked)
      comments = await attachCommentBadges(comments)
    }

    if (isAnonymous) {
      comments = comments.map((item) =>
        sanitizeAnonymousCommunityComment(item, user?.uid),
      )
    }

    const locale = await getRequestLocale(request)
    // isMine: 앱이 내 댓글(수정·삭제)과 남의 댓글(신고·차단)을 구분하는 값. 익명 댓글의 작성자 uid는 내보내지 않는다
    return NextResponse.json({
      comments: localizeComments(comments, locale, { viewerUid: user?.uid }).map((item) => ({
        ...hideCommentAuthorEmail(item, user?.uid),
        isMine: Boolean(user?.uid && item.authorUid === user.uid),
      })),
    })
  } catch (error) {
    console.error('Community comments list error:', error)
    return NextResponse.json(
      { comments: [], error: 'Failed to load comments.' },
      { status: 500 },
    )
  }
}

/** 작성자 인증 배지 (응답에만): 대표 학교·직장인·인스타그램. 인증되면 예전 댓글에도 바로 보인다 */
async function attachCommentBadges(comments: CommunityComment[]): Promise<CommunityComment[]> {
  const uids = [...new Set(comments.map((item) => item.authorUid).filter(Boolean))]
  const profiles = new Map(
    await Promise.all(
      uids.map(async (uid) => [uid, await listProfileCache.get(uid, () => getSupabaseProfile(uid))] as const),
    ),
  )
  return comments.map((item) => {
    const profile = profiles.get(item.authorUid)
    if (!profile) return item
    const schoolId = profile.schoolEmailVerified ? profile.verifiedSchoolId?.trim() || null : null
    return {
      ...item,
      authorSchoolId: schoolId ?? item.authorSchoolId,
      authorWorkplaceVerified: profile.workplaceStatus === 'approved',
      authorInstagramVerified: Boolean(profile.instagramVerified),
    }
  })
}

async function enrichCommentAuthors(
  comments: CommunityComment[],
): Promise<CommunityComment[]> {
  const needsEnrich = comments.filter((item) => {
    if (item.status !== 'open') return false
    if (!item.authorPhotoURL?.trim()) return true
    const nick = item.authorNickname?.trim() || ''
    if (!nick) return true
    // 예전에 저장된 이메일 아이디도 닉네임으로 교체
    const emailLocal = item.authorEmail?.split('@')[0]?.trim()
    if (emailLocal && nick === emailLocal) return true
    if (nick.includes('@')) return true
    return false
  })
  if (needsEnrich.length === 0) return comments

  const uids = [...new Set(needsEnrich.map((item) => item.authorUid))]
  const profiles = await Promise.all(
    uids.map(async (uid) => {
      const profile = await getSupabaseProfile(uid)
      return [uid, profile] as const
    }),
  )
  const byUid = new Map(profiles)

  return comments.map((item) => {
    const profile = byUid.get(item.authorUid)
    if (!profile) return item
    const email =
      (typeof profile.email === 'string' ? profile.email : null) ||
      item.authorEmail
    const nickname =
      sanitizeCommunityNickname(item.authorNickname, email) ||
      resolveCommunityNickname({
        nickname:
          typeof profile.nickname === 'string' ? profile.nickname : null,
        firstName:
          typeof profile.firstName === 'string' ? profile.firstName : null,
        lastName:
          typeof profile.lastName === 'string' ? profile.lastName : null,
        email,
      })
    const photoURL =
      item.authorPhotoURL?.trim() ||
      (typeof profile.photoURL === 'string' ? profile.photoURL.trim() : '') ||
      null
    if (
      nickname === (item.authorNickname?.trim() || null) &&
      photoURL === item.authorPhotoURL
    ) {
      return item
    }
    return { ...item, authorNickname: nickname, authorPhotoURL: photoURL }
  })
}

type CreateBody = {
  body?: string
  parentId?: string | null
  authorNickname?: string | null
  authorPhotoURL?: string | null
  authorSchoolId?: string | null
}

export async function POST(request: Request, context: RouteContext) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredLocal'),
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }

  const profile = await getSupabaseProfile(user.uid)
  if (profile?.status === 'suspended') {
    return NextResponse.json(
      { error: t('common.accountSuspended') },
      { status: 403 },
    )
  }
  if (!isIdentityVerified(profile)) {
    return NextResponse.json(
      {
        error: t('common.identityVerificationRequired'),
        code: SCHOOL_VERIFY_REQUIRED_CODE,
      },
      { status: 403 },
    )
  }

  const { id: postId } = await context.params
  const postExists =
    postId.startsWith('mock-') ||
    (isCommunityStorageConfigured()
      ? Boolean(await getStoredCommunityPost(postId))
      : true)

  if (!postExists) {
    return NextResponse.json({ error: t('common.postNotFound') }, { status: 404 })
  }

  const payload = (await request.json().catch(() => null)) as CreateBody | null
  const body = String(payload?.body || '').trim()
  if (!body) {
    return NextResponse.json({ error: t('comments.bodyRequired') }, { status: 400 })
  }
  if (body.length > 2000) {
    return NextResponse.json(
      { error: t('comments.bodyTooLong', { max: formatNumber(locale, 2000) }) },
      { status: 400 },
    )
  }

  const categoryId = await resolvePostCategoryId(postId)
  const isAnonymous = categoryId ? isAnonymousBoard(categoryId) : false

  const existing = await listStoredCommunityComments(postId)
  let parentId =
    payload?.parentId == null || payload.parentId === ''
      ? null
      : String(payload.parentId).trim()

  if (parentId) {
    const parent = existing.find((item) => item.id === parentId)
    if (!parent || parent.status !== 'open') {
      return NextResponse.json(
        { error: t('comments.parentNotFound') },
        { status: 400 },
      )
    }
    // 대댓글의 대댓글은 루트 댓글에 붙임 (1단만)
    if (parent.parentId) parentId = parent.parentId
  }

  const now = Date.now()
  const authorNickname = isAnonymous
    ? null
    : resolveCommunityNickname(
        profile
          ? {
              nickname:
                typeof profile.nickname === 'string' ? profile.nickname : null,
              firstName:
                typeof profile.firstName === 'string'
                  ? profile.firstName
                  : null,
              lastName:
                typeof profile.lastName === 'string' ? profile.lastName : null,
              email: user.email,
            }
          : { email: user.email },
      ) ||
      sanitizeCommunityNickname(
        typeof payload?.authorNickname === 'string'
          ? payload.authorNickname
          : null,
        user.email,
      ) ||
      null
  const authorPhotoURL = isAnonymous
    ? null
    : (typeof profile?.photoURL === 'string' && profile.photoURL.trim()) ||
      (typeof payload?.authorPhotoURL === 'string'
        ? payload.authorPhotoURL.trim() || null
        : null) ||
      null
  const authorSchoolId = isAnonymous
    ? null
    : (typeof profile?.verifiedSchoolId === 'string' &&
        profile.verifiedSchoolId.trim()) ||
      null

  const comment: CommunityComment = {
    id: `cmt_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    postId,
    parentId,
    body,
    sourceLocale: locale,
    authorUid: user.uid,
    authorEmail: user.email,
    authorNickname,
    authorPhotoURL,
    authorSchoolId,
    createdAt: now,
    updatedAt: now,
    status: 'open',
  }

  try {
    const next = [...existing, comment]
    await saveStoredCommunityComments(postId, next)

    try {
      const post = isCommunityStorageConfigured()
        ? await getStoredCommunityPost(postId)
        : null
      const parent = parentId
        ? existing.find((item) => item.id === parentId)
        : null
      // 포인트: 전환 전 = 기존 크레딧, 후 = 원장 (최소 글자 수 규칙에 body 필요) — src/lib/points/WIRING.md
      const { onCommentCreated } = await import('@lib/points/facade.server')
      await onCommentCreated({
        uid: user.uid,
        commentId: comment.id,
        postId,
        boardId: categoryId,
        postAuthorUid: post?.authorUid ?? null,
        parentAuthorUid: parent?.authorUid ?? null,
        body: comment.body,
      })
      void notifyCommentPush({ comment, post, parent, isAnonymous }).catch((pushError) => {
        console.error('Community comment push error:', pushError)
      })
    } catch (creditError) {
      console.error('Community credit award (comment) error:', creditError)
    }

    return NextResponse.json({
      comment: sanitizeAnonymousCommunityComment(comment, user.uid),
    })
  } catch (error) {
    console.error('Community comment create error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'comments.createFailed'),
      },
      { status: 500 },
    )
  }
}

type PatchBody = {
  commentId?: string
  body?: string
}

export async function PATCH(request: Request, context: RouteContext) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredLocal'),
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }

  const { id: postId } = await context.params
  const payload = (await request.json().catch(() => null)) as PatchBody | null
  const commentId = String(payload?.commentId || '').trim()
  const body = String(payload?.body || '').trim()

  if (!commentId) {
    return NextResponse.json(
      { error: t('comments.editTargetRequired') },
      { status: 400 },
    )
  }
  if (!body) {
    return NextResponse.json({ error: t('comments.bodyRequired') }, { status: 400 })
  }
  if (body.length > 2000) {
    return NextResponse.json(
      { error: t('comments.bodyTooLong', { max: formatNumber(locale, 2000) }) },
      { status: 400 },
    )
  }

  const existing = await listStoredCommunityComments(postId)
  const target = existing.find((item) => item.id === commentId)
  if (!target || target.status !== 'open') {
    return NextResponse.json(
      { error: t('comments.notFound') },
      { status: 404 },
    )
  }
  if (target.authorUid !== user.uid) {
    return NextResponse.json(
      { error: t('comments.editOwnOnly') },
      { status: 403 },
    )
  }

  const now = Date.now()
  const updated: CommunityComment = {
    ...target,
    body,
    updatedAt: now,
  }
  const next = existing.map((item) =>
    item.id === commentId ? updated : item,
  )

  try {
    await saveStoredCommunityComments(postId, next)
    const categoryId = await resolvePostCategoryId(postId)
    const isAnonymous = categoryId ? isAnonymousBoard(categoryId) : false
    return NextResponse.json({
      comment: isAnonymous
        ? sanitizeAnonymousCommunityComment(updated, user.uid)
        : updated,
    })
  } catch (error) {
    console.error('Community comment update error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'comments.updateFailed'),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const t = await getRequestT(request, 'api')
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error: t('common.supabaseNotConfiguredLocal'),
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  }

  const { id: postId } = await context.params
  const { searchParams } = new URL(request.url)
  const commentId = String(searchParams.get('commentId') || '').trim()
  if (!commentId) {
    return NextResponse.json(
      { error: t('comments.deleteTargetRequired') },
      { status: 400 },
    )
  }

  const existing = await listStoredCommunityComments(postId)
  const target = existing.find((item) => item.id === commentId)
  if (!target || target.status !== 'open') {
    return NextResponse.json(
      { error: t('comments.notFound') },
      { status: 404 },
    )
  }
  if (target.authorUid !== user.uid) {
    return NextResponse.json(
      { error: t('comments.deleteOwnOnly') },
      { status: 403 },
    )
  }

  const now = Date.now()
  const next = existing.map((item) => {
    const shouldDelete =
      item.id === commentId ||
      (item.parentId === commentId && item.status === 'open')
    if (!shouldDelete) return item
    return {
      ...item,
      status: 'deleted' as const,
      updatedAt: now,
    }
  })

  try {
    await saveStoredCommunityComments(postId, next)
    try {
      const { onCommentDeleted } = await import('@lib/points/facade.server')
      await onCommentDeleted({ uid: user.uid, commentId })
      // 함께 삭제된 대댓글 회수 (작성자 본인 것만 위에서 soft-delete됨 — 타인의 대댓글도 soft-delete될 수 있음)
      for (const item of next) {
        if (
          item.parentId === commentId &&
          item.status === 'deleted' &&
          item.authorUid
        ) {
          await onCommentDeleted({ uid: item.authorUid, commentId: item.id })
        }
      }
    } catch (creditError) {
      console.error('Community credit revoke (comment) error:', creditError)
    }
    return NextResponse.json({ ok: true, commentId })
  } catch (error) {
    console.error('Community comment delete error:', error)
    return NextResponse.json(
      {
        error: apiErrorMessage(t, error, 'comments.deleteFailed'),
      },
      { status: 500 },
    )
  }
}

/** App push: reply → the parent comment's author, comment → the post's author. Never to yourself, never to someone who blocked the commenter. */
async function notifyCommentPush(input: {
  comment: CommunityComment
  post: { authorUid?: string | null; title?: string | null; categoryId?: string | null } | null
  parent: CommunityComment | null | undefined
  isAnonymous: boolean
}) {
  const { comment, post, parent, isAnonymous } = input
  const me = comment.authorUid
  const name = (t: (key: string) => string) =>
    isAnonymous ? t('api.push.anonymous') : comment.authorNickname?.trim() || t('api.push.someone')
  const preview = previewText(comment.body)
  const data = { type: 'comment', postId: comment.postId, boardId: post?.categoryId ?? '' }

  const blockedMe = async (uid: string) => (await getViewerBlockedUids(uid)).has(me)

  const parentAuthor = parent?.authorUid && parent.authorUid !== me ? parent.authorUid : null
  if (parentAuthor && !(await blockedMe(parentAuthor))) {
    notifyUsers({
      type: 'reply',
      userIds: [parentAuthor],
      build: (t) => ({
        title: t('api.push.reply.title'),
        body: t('api.push.reply.body', { name: name(t), preview }),
        data,
        threadId: `post-${comment.postId}`,
      }),
    })
  }

  const postAuthor = post?.authorUid && post.authorUid !== me && post.authorUid !== parentAuthor ? post.authorUid : null
  if (postAuthor && !(await blockedMe(postAuthor))) {
    notifyUsers({
      type: 'comment',
      userIds: [postAuthor],
      build: (t) => ({
        title: post?.title ? t('api.push.comment.onPost', { title: previewText(post.title, 40) }) : t('api.push.comment.title'),
        body: t('api.push.comment.body', { name: name(t), preview }),
        data,
        threadId: `post-${comment.postId}`,
      }),
    })
  }
}
