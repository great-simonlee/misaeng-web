import type { CommunityComment } from '@/types/nyc'
import {
  buildCommentThreads,
  listMockCommunityComments,
} from '@lib/constants/communityCommentsMock'
import {
  listLocalCommunityComments,
  mergeCommunityComments,
  upsertLocalCommunityComment,
} from '@lib/community/comments.local'

export { buildCommentThreads }

export async function fetchCommunityComments(
  postId: string,
): Promise<CommunityComment[]> {
  let remote: CommunityComment[] = []
  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(postId)}/comments`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = (await res.json()) as { comments?: CommunityComment[] }
      if (Array.isArray(data.comments)) remote = data.comments
    }
  } catch {
    // 로컬/목 데이터로 폴백
  }

  if (remote.length === 0) {
    remote = listMockCommunityComments(postId)
  }

  const local = listLocalCommunityComments(postId)
  return mergeCommunityComments(remote, local).filter(
    (item) => item.status === 'open',
  )
}

export async function createCommunityCommentRequest(input: {
  postId: string
  body: string
  parentId?: string | null
  authorUid: string
  authorEmail: string
  authorNickname?: string | null
  authorSchoolId?: string | null
}): Promise<CommunityComment> {
  const body = input.body.trim()
  if (!body) throw new Error('댓글을 입력해 주세요.')
  if (!input.authorUid || !input.authorEmail) {
    throw new Error('로그인이 필요해요.')
  }

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(input.postId)}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          parentId: input.parentId ?? null,
          authorNickname: input.authorNickname ?? null,
          authorSchoolId: input.authorSchoolId ?? null,
        }),
      },
    )
    const data = (await res.json().catch(() => null)) as
      | { comment?: CommunityComment; error?: string; code?: string }
      | null

    if (res.ok && data?.comment) {
      upsertLocalCommunityComment(data.comment)
      return data.comment
    }

    if (res.status === 503 || input.postId.startsWith('mock-') || res.status === 401) {
      return createLocalComment(input, body)
    }

    throw new Error(data?.error || '댓글 등록에 실패했어요')
  } catch (error) {
    if (input.postId.startsWith('mock-') || error instanceof TypeError) {
      return createLocalComment(input, body)
    }
    throw error
  }
}

function createLocalComment(
  input: {
    postId: string
    parentId?: string | null
    authorUid: string
    authorEmail: string
    authorNickname?: string | null
    authorSchoolId?: string | null
  },
  body: string,
): CommunityComment {
  const existing = listLocalCommunityComments(input.postId)
  const mocks = listMockCommunityComments(input.postId)
  const all = mergeCommunityComments(mocks, existing)

  let parentId =
    input.parentId == null || input.parentId === ''
      ? null
      : String(input.parentId).trim()

  if (parentId) {
    const parent = all.find(
      (item) => item.id === parentId && item.status === 'open',
    )
    if (!parent) throw new Error('대댓글 대상 댓글을 찾을 수 없어요.')
    if (parent.parentId) parentId = parent.parentId
  }

  const now = Date.now()
  const comment: CommunityComment = {
    id: `local_cmt_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    postId: input.postId,
    parentId,
    body,
    authorUid: input.authorUid,
    authorEmail: input.authorEmail,
    authorNickname: input.authorNickname?.trim() || null,
    authorSchoolId: input.authorSchoolId ?? null,
    createdAt: now,
    updatedAt: now,
    status: 'open',
  }

  return upsertLocalCommunityComment(comment)
}
