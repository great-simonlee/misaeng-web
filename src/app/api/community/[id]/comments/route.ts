import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { listMockCommunityComments } from '@lib/constants/communityCommentsMock'
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: postId } = await context.params
    const stored = isCommunityCommentStorageConfigured()
      ? await listStoredCommunityComments(postId)
      : []
    let comments =
      stored.length > 0 ? stored : listMockCommunityComments(postId)

    if (stored.length > 0) {
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
  const profile = await getSupabaseProfile(user.uid)
  const authorNickname =
    (typeof profile?.nickname === 'string' && profile.nickname.trim()) ||
    (typeof payload?.authorNickname === 'string'
      ? payload.authorNickname.trim() || null
      : null) ||
    null
  const authorPhotoURL =
    (typeof profile?.photoURL === 'string' && profile.photoURL.trim()) ||
    (typeof payload?.authorPhotoURL === 'string'
      ? payload.authorPhotoURL.trim() || null
      : null) ||
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
    authorSchoolId:
      typeof payload?.authorSchoolId === 'string'
        ? payload.authorSchoolId
        : null,
    createdAt: now,
    updatedAt: now,
    status: 'open',
  }

  try {
    const next = [...existing, comment]
    await saveStoredCommunityComments(postId, next)
    return NextResponse.json({ comment })
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
