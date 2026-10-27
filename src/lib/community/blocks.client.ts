import { throwCommunityRequestError } from '@lib/community/client'

/** 차단한 사용자 (GET /api/community/blocks). 작성자 uid는 오지 않는다 */
export type BlockedUser = {
  id: string
  label: string | null
  anonymous: boolean
  createdAt: number
}

type BlocksResponse = { blocks?: BlockedUser[]; error?: string }

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const res = await fetch('/api/community/blocks', { cache: 'no-store' })
  const data = (await res.json().catch(() => null)) as BlocksResponse | null
  if (!res.ok) throwCommunityRequestError(data?.error, 'blocks.loadFailed')
  return data?.blocks ?? []
}

/** 글(또는 그 글의 댓글) 작성자를 차단한다. 작성자는 서버가 찾는다 */
export async function blockAuthorRequest(input: {
  postId: string
  commentId?: string | null
}): Promise<BlockedUser[]> {
  const res = await fetch('/api/community/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: input.postId, commentId: input.commentId ?? null }),
  })
  const data = (await res.json().catch(() => null)) as BlocksResponse | null
  if (!res.ok) throwCommunityRequestError(data?.error, 'blocks.failed')
  return data?.blocks ?? []
}

export async function unblockUserRequest(id: string): Promise<BlockedUser[]> {
  const res = await fetch('/api/community/blocks', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = (await res.json().catch(() => null)) as BlocksResponse | null
  if (!res.ok) throwCommunityRequestError(data?.error, 'blocks.unblockFailed')
  return data?.blocks ?? []
}
