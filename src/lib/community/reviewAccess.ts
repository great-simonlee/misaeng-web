import type { CommunityPost } from '@/types/nyc'
import { COMPANY_REVIEW_BOARD } from '@lib/constants/company'

/**
 * 면접/취업 후기 본문 열람 판단은 이 파일 한 곳에서만 한다.
 * 모든 후기 API(목록, 상세, 회사별 후기)가 이 함수를 거친다.
 *
 * 현재 규칙: 누구나 본문을 볼 수 있다 (열람 제한·크레딧 차감 없음).
 * 나중에 "기여하면 열람" / "결제 열람(fast track)" 을 붙일 때 이 함수만 바꾼다.
 */
export type ReviewViewer = { uid: string; email?: string | null } | null

export function isGatedReviewBoard(categoryId: string): boolean {
  return categoryId === COMPANY_REVIEW_BOARD
}

export function canViewReviewBody(
  viewer: ReviewViewer,
  review: Pick<CommunityPost, 'categoryId' | 'authorUid'>,
): boolean {
  if (!isGatedReviewBoard(review.categoryId)) return true
  if (viewer?.uid && viewer.uid === review.authorUid) return true
  return true
}

const BODY_FIELDS = ['contentHtml', 'description', 'jobReviewTimeline', 'jobReviewTips'] as const

/** 본문을 볼 수 없으면 본문 필드를 비운 사본을 돌려준다. */
export function applyReviewBodyAccess(
  post: CommunityPost,
  viewer: ReviewViewer,
): CommunityPost & { bodyLocked?: boolean } {
  if (canViewReviewBody(viewer, post)) return post
  return {
    ...post,
    contentHtml: '',
    description: '',
    jobReviewTimeline: [],
    jobReviewTips: null,
    bodyLocked: true,
  }
}

/** 공개 메타데이터와 본문을 나눠서 돌려준다 (회사별 후기 API). */
export function splitReviewForViewer(post: CommunityPost, viewer: ReviewViewer) {
  const canViewBody = canViewReviewBody(viewer, post)
  const meta = {
    id: post.id,
    title: post.title,
    jobReviewType: post.jobReviewType,
    typeLabel: post.detail || null,
    jobReviewIndustry: post.jobReviewIndustry,
    companyId: post.companyId ?? null,
    companyText: post.location || null,
    city: post.city ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount,
    commentCount: post.commentCount,
    recommendCount: post.recommendCount,
    authorNickname: post.authorNickname,
    authorSchoolName: post.authorSchoolName,
  }
  const body = canViewBody
    ? Object.fromEntries(BODY_FIELDS.map((field) => [field, post[field]]))
    : null
  return { meta, body, canViewBody }
}
