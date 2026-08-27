import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import {
  sanitizeAnonymousCommunityComment,
} from '@lib/community/anonymous'
import {
  isSchoolVerified,
  SCHOOL_VERIFY_REQUIRED_CODE,
  SCHOOL_VERIFY_REQUIRED_MESSAGE,
} from '@lib/community/schoolGate'
import { getMockCommunityPost } from '@lib/constants/communityMock'
import { listMockCommunityComments } from '@lib/constants/communityCommentsMock'
import { isAnonymousBoard } from '@lib/constants/nyc'
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
import type { CommunityComment } from '@/types/nyc'

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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: postId } = await context.params
    const categoryId = await resolvePostCategoryId(postId)
    const isAnonymous = categoryId ? isAnonymousBoard(categoryId) : false
    const user = await resolveAuthenticatedUser()
    const stored = isCommunityCommentStorageConfigured()
      ? await listStoredCommunityComments(postId)
      : []
    let comments =
      stored.length > 0 ? stored : listMockCommunityComments(postId)

    if (stored.length > 0 && !isAnonymous) {
      comments = await enrichCommentAuthors(comments)
      const changed = comments.some(
        (item, index) =>
          item.authorPhotoURL !== stored[index]?.authorPhotoURL ||
          item.authorNickname !== stored[index]?.authorNickname,
      )
      if (changed) {
        try {
          await saveStoredCommunityComments(postId, comments)
        } catch {
          // 표시만 보강
        }
      }
    }

    if (isAnonymous) {
      comments = comments.map((item) =>
        sanitizeAnonymousCommunityComment(item, user?.uid),
      )
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Community comments list error:', error)
    return NextResponse.json(
      { comments: [], error: 'Failed to load comments.' },
      { status: 500 },
    )
  }
}

async function enrichCommentAuthors(
  comments: CommunityComment[],
): Promise<CommunityComment[]> {
  const needsEnrich = comments.filter(
    (item) =>
      item.status === 'open' &&
      (!item.authorPhotoURL?.trim() || !item.authorNickname?.trim()),
  )
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
    const nickname =
      item.authorNickname?.trim() ||
      (typeof profile.nickname === 'string' ? profile.nickname.trim() : '') ||
      null
    const photoURL =
      item.authorPhotoURL?.trim() ||
      (typeof profile.photoURL === 'string' ? profile.photoURL.trim() : '') ||
      null
    if (
      nickname === item.authorNickname &&
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
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. 로컬에서는 브라우저에 임시 저장돼요.',
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid || !user.email) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const profile = await getSupabaseProfile(user.uid)
  if (!isSchoolVerified(profile)) {
    return NextResponse.json(
      {
        error: SCHOOL_VERIFY_REQUIRED_MESSAGE,
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
    return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 })
  }

  const payload = (await request.json().catch(() => null)) as CreateBody | null
  const body = String(payload?.body || '').trim()
  if (!body) {
    return NextResponse.json({ error: '댓글을 입력해 주세요.' }, { status: 400 })
  }
  if (body.length > 2000) {
    return NextResponse.json(
      { error: '댓글은 2000자 이내로 작성해 주세요.' },
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
        { error: '대댓글 대상 댓글을 찾을 수 없어요.' },
        { status: 400 },
      )
    }
    // 대댓글의 대댓글은 루트 댓글에 붙임 (1단만)
    if (parent.parentId) parentId = parent.parentId
  }

  const now = Date.now()
  const authorNickname = isAnonymous
    ? null
    : (typeof profile?.nickname === 'string' && profile.nickname.trim()) ||
      (typeof payload?.authorNickname === 'string'
        ? payload.authorNickname.trim() || null
        : null) ||
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
    return NextResponse.json({
      comment: sanitizeAnonymousCommunityComment(comment, user.uid),
    })
  } catch (error) {
    console.error('Community comment create error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '댓글 등록에 실패했어요.',
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
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. 로컬에서는 브라우저에 임시 저장돼요.',
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { id: postId } = await context.params
  const payload = (await request.json().catch(() => null)) as PatchBody | null
  const commentId = String(payload?.commentId || '').trim()
  const body = String(payload?.body || '').trim()

  if (!commentId) {
    return NextResponse.json(
      { error: '수정할 댓글을 지정해 주세요.' },
      { status: 400 },
    )
  }
  if (!body) {
    return NextResponse.json({ error: '댓글을 입력해 주세요.' }, { status: 400 })
  }
  if (body.length > 2000) {
    return NextResponse.json(
      { error: '댓글은 2000자 이내로 작성해 주세요.' },
      { status: 400 },
    )
  }

  const existing = await listStoredCommunityComments(postId)
  const target = existing.find((item) => item.id === commentId)
  if (!target || target.status !== 'open') {
    return NextResponse.json(
      { error: '댓글을 찾을 수 없어요.' },
      { status: 404 },
    )
  }
  if (target.authorUid !== user.uid) {
    return NextResponse.json(
      { error: '본인이 작성한 댓글만 수정할 수 있어요.' },
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
        error:
          error instanceof Error ? error.message : '댓글 수정에 실패했어요.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isCommunityCommentStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          'Supabase 설정이 필요해요. 로컬에서는 브라우저에 임시 저장돼요.',
        code: 'STORAGE_UNAVAILABLE',
      },
      { status: 503 },
    )
  }

  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { id: postId } = await context.params
  const { searchParams } = new URL(request.url)
  const commentId = String(searchParams.get('commentId') || '').trim()
  if (!commentId) {
    return NextResponse.json(
      { error: '삭제할 댓글을 지정해 주세요.' },
      { status: 400 },
    )
  }

  const existing = await listStoredCommunityComments(postId)
  const target = existing.find((item) => item.id === commentId)
  if (!target || target.status !== 'open') {
    return NextResponse.json(
      { error: '댓글을 찾을 수 없어요.' },
      { status: 404 },
    )
  }
  if (target.authorUid !== user.uid) {
    return NextResponse.json(
      { error: '본인이 작성한 댓글만 삭제할 수 있어요.' },
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
    return NextResponse.json({ ok: true, commentId })
  } catch (error) {
    console.error('Community comment delete error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '댓글 삭제에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
