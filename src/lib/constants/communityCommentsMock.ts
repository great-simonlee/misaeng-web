import type {
  CommunityComment,
  CommunityCommentThread,
} from '@/types/nyc'

const NOW = Date.now()
const HOUR = 60 * 60 * 1000

function comment(
  partial: Omit<CommunityComment, 'status' | 'updatedAt' | 'authorPhotoURL'> & {
    updatedAt?: number
    authorPhotoURL?: string | null
  },
): CommunityComment {
  return {
    ...partial,
    authorPhotoURL: partial.authorPhotoURL ?? null,
    updatedAt: partial.updatedAt ?? partial.createdAt,
    status: 'open',
  }
}

/** 목 게시글용 댓글·대댓글 */
export const COMMUNITY_MOCK_COMMENTS: CommunityComment[] = [
  comment({
    id: 'mock-cmt-food-1',
    postId: 'mock-food-1',
    parentId: null,
    body: '여기 진짜 맛있어요! 주말에 웨이팅 40분 했습니다.',
    authorUid: 'mock-user-a',
    authorEmail: 'a@nyu.edu',
    authorNickname: '플러싱러버',
    authorSchoolId: 'nyu',
    createdAt: NOW - 2 * HOUR,
  }),
  comment({
    id: 'mock-cmt-food-1-r1',
    postId: 'mock-food-1',
    parentId: 'mock-cmt-food-1',
    body: '저도 어제 갔는데 그래도 갈 만하더라고요 ㅎㅎ',
    authorUid: 'mock-user-1',
    authorEmail: 'foodlover@nyu.edu',
    authorNickname: '칼국수매니아',
    authorSchoolId: 'nyu',
    createdAt: NOW - 1 * HOUR,
  }),
  comment({
    id: 'mock-cmt-food-2',
    postId: 'mock-food-1',
    parentId: null,
    body: '김치가 특히 맛있어요. 다음에 친구 데리고 가려구요.',
    authorUid: 'mock-user-b',
    authorEmail: 'b@columbia.edu',
    authorNickname: null,
    authorSchoolId: null,
    createdAt: NOW - 50 * 60 * 1000,
  }),
  comment({
    id: 'mock-cmt-market-1',
    postId: 'mock-market-1',
    parentId: null,
    body: '아직 있나요? 오늘 저녁 픽업 가능해요!',
    authorUid: 'mock-user-c',
    authorEmail: 'c@baruch.edu',
    authorNickname: '브루클린살림',
    authorSchoolId: null,
    createdAt: NOW - 3 * HOUR,
  }),
  comment({
    id: 'mock-cmt-market-1-r1',
    postId: 'mock-market-1',
    parentId: 'mock-cmt-market-1',
    body: '네 아직 있어요. DM 주세요!',
    authorUid: 'mock-user-4',
    authorEmail: 'moveout@baruch.edu',
    authorNickname: null,
    authorSchoolId: null,
    createdAt: NOW - 2.5 * HOUR,
  }),

]

export function listMockCommunityComments(
  postId: string,
): CommunityComment[] {
  return COMMUNITY_MOCK_COMMENTS.filter(
    (item) => item.postId === postId && item.status === 'open',
  ).sort((a, b) => a.createdAt - b.createdAt)
}

/** 평면 댓글 목록 → 댓글 + 대댓글 스레드 */
export function buildCommentThreads(
  comments: CommunityComment[],
): CommunityCommentThread[] {
  const open = comments
    .filter((item) => item.status === 'open')
    .sort((a, b) => a.createdAt - b.createdAt)

  const roots = open.filter((item) => !item.parentId)
  const replies = open.filter((item) => item.parentId)

  return roots.map((root) => ({
    ...root,
    replies: replies.filter((item) => item.parentId === root.id),
  }))
}

export function countOpenComments(comments: CommunityComment[]) {
  return comments.filter((item) => item.status === 'open').length
}
