import { isStatusCommunityBoard } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'

const STATUS_FINAL_RE =
  /(승인|수령|거절|발급|최종|완료|approved|denied|rejected|ead\b|i-?797|영주권\s*카드|비자\s*승인|그린\s*카드)/i

const JOB_FINAL_RE =
  /\b(offer|reject|rejected|denied|hired|final)\b|거절|합격|채용|최종\s*합격|오퍼|계약\s*체결/i

/** OPT·비자·영주권 타임라인에 최종 결과로 볼 만한 기록이 있는지 */
export function hasCptOptFinalResult(
  timeline: CommunityPost['cptOptTimeline'] | null | undefined,
): boolean {
  if (!Array.isArray(timeline) || timeline.length === 0) return false
  return timeline.some((entry) => {
    const result = String(entry.resultReceived || '').trim()
    if (result.length < 2) return false
    return STATUS_FINAL_RE.test(result) || STATUS_FINAL_RE.test(entry.nextStep || '')
  })
}

/** 취업 후기 타임라인에 최종 결과(오퍼·거절 등)가 있는지 */
export function hasJobReviewFinalResult(
  timeline: CommunityPost['jobReviewTimeline'] | null | undefined,
): boolean {
  if (!Array.isArray(timeline) || timeline.length === 0) return false
  return timeline.some((entry) => {
    const outcome = String(entry.outcome || '').trim()
    const stage = String(entry.stageLabel || '').trim()
    if (!outcome && !stage) return false
    return JOB_FINAL_RE.test(outcome) || JOB_FINAL_RE.test(stage)
  })
}

export function postHasFinalResultForCreditReview(post: CommunityPost): boolean {
  if (isStatusCommunityBoard(post.categoryId) || post.categoryId === 'status') {
    return hasCptOptFinalResult(post.cptOptTimeline)
  }
  if (post.categoryId === 'job-review') {
    return hasJobReviewFinalResult(post.jobReviewTimeline)
  }
  return false
}

export function isCreditReviewEligibleBoard(boardId: string): boolean {
  return (
    boardId === 'job-review' ||
    boardId === 'status' ||
    isStatusCommunityBoard(boardId)
  )
}
