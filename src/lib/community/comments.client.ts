import type { CommunityComment } from '@/types/nyc'
import {
  buildCommentThreads,
  countOpenComments,
  listMockCommunityComments,
} from '@lib/constants/communityCommentsMock'
import {
  listLocalCommunityComments,
  markLocalCommunityCommentDeleted,
  mergeCommunityComments,
  upsertLocalCommunityComment,
} from '@lib/community/comments.local'

export { buildCommentThreads }

export async function fetchCommunityCommentCount(
  postId: string,
): Promise<number> {
  const comments = await fetchCommunityComments(postId)
  return countOpenComments(comments)
}

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
  authorPhotoURL?: string | null
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
          authorPhotoURL: input.authorPhotoURL ?? null,
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

    if (res.status === 401) {
      throw new Error(data?.error || '로그인이 필요해요.')
    }

    if (res.status === 403) {
      throw new Error(
        data?.error || '글과 댓글을 작성하려면 학교 이메일 인증이 필요해요.',
      )
    }

    if (res.status === 503 || input.postId.startsWith('mock-')) {
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
    authorPhotoURL?: string | null
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
    authorPhotoURL: input.authorPhotoURL?.trim() || null,
    authorSchoolId: input.authorSchoolId ?? null,
    createdAt: now,
    updatedAt: now,
    status: 'open',
  }

  return upsertLocalCommunityComment(comment)
}

export async function updateCommunityCommentRequest(input: {
  postId: string
  commentId: string
  body: string
  authorUid: string
}): Promise<CommunityComment> {
  const body = input.body.trim()
  if (!body) throw new Error('댓글을 입력해 주세요.')
  if (!input.authorUid) throw new Error('로그인이 필요해요.')
  if (!input.commentId) throw new Error('수정할 댓글을 지정해 주세요.')

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(input.postId)}/comments`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: input.commentId,
          body,
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

    if (res.status === 401) {
      throw new Error(data?.error || '로그인이 필요해요.')
    }
    if (res.status === 403) {
      throw new Error(data?.error || '본인이 작성한 댓글만 수정할 수 있어요.')
    }
    if (res.status === 404) {
      throw new Error(data?.error || '댓글을 찾을 수 없어요.')
    }

    if (res.status === 503 || input.postId.startsWith('mock-')) {
      return updateLocalComment(input, body)
    }

    throw new Error(data?.error || '댓글 수정에 실패했어요')
  } catch (error) {
    if (input.postId.startsWith('mock-') || error instanceof TypeError) {
      return updateLocalComment(input, body)
    }
    throw error
  }
}

function updateLocalComment(
  input: {
    postId: string
    commentId: string
    authorUid: string
  },
  body: string,
): CommunityComment {
  const existing = listLocalCommunityComments(input.postId)
  const mocks = listMockCommunityComments(input.postId)
  const all = mergeCommunityComments(mocks, existing)
  const target = all.find(
    (item) => item.id === input.commentId && item.status === 'open',
  )
  if (!target) throw new Error('댓글을 찾을 수 없어요.')
  if (target.authorUid !== input.authorUid) {
    throw new Error('본인이 작성한 댓글만 수정할 수 있어요.')
  }
  const updated: CommunityComment = {
    ...target,
    body,
    updatedAt: Date.now(),
  }
  return upsertLocalCommunityComment(updated)
}

export async function deleteCommunityCommentRequest(input: {
  postId: string
  commentId: string
  authorUid: string
}): Promise<void> {
  if (!input.authorUid) throw new Error('로그인이 필요해요.')
  if (!input.commentId) throw new Error('삭제할 댓글을 지정해 주세요.')

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(input.postId)}/comments?commentId=${encodeURIComponent(input.commentId)}`,
      { method: 'DELETE' },
    )
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; code?: string }
      | null

    if (res.ok) {
      markLocalCommunityCommentDeleted(input.postId, input.commentId)
      return
    }

    if (res.status === 401) {
      throw new Error(data?.error || '로그인이 필요해요.')
    }
    if (res.status === 403) {
      throw new Error(data?.error || '본인이 작성한 댓글만 삭제할 수 있어요.')
    }
    if (res.status === 404) {
      throw new Error(data?.error || '댓글을 찾을 수 없어요.')
    }

    if (res.status === 503 || input.postId.startsWith('mock-')) {
      deleteLocalComment(input)
      return
    }

    throw new Error(data?.error || '댓글 삭제에 실패했어요')
  } catch (error) {
    if (input.postId.startsWith('mock-') || error instanceof TypeError) {
      deleteLocalComment(input)
      return
    }
    throw error
  }
}

function deleteLocalComment(input: {
  postId: string
  commentId: string
  authorUid: string
}) {
  const existing = listLocalCommunityComments(input.postId)
  const mocks = listMockCommunityComments(input.postId)
  const all = mergeCommunityComments(mocks, existing)
  const target = all.find(
    (item) => item.id === input.commentId && item.status === 'open',
  )
  if (!target) throw new Error('댓글을 찾을 수 없어요.')
  if (target.authorUid !== input.authorUid) {
    throw new Error('본인이 작성한 댓글만 삭제할 수 있어요.')
  }
  markLocalCommunityCommentDeleted(input.postId, input.commentId)
}
