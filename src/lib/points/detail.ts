import { htmlToPlainText } from '@lib/community/html'
import { isAnonymousBoard, isStatusCommunityBoard } from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'

import type { ClaimBoard } from './defaults'

/**
 * Detail completeness (spec 3.2 "detail": every required structured field filled → +detail).
 * Only fields that exist on posts TODAY (src/types/nyc.ts) are checked. Spec fields that have no post field yet
 * are listed in SPEC_FIELDS_MISSING; once the write forms store them under the proposed names below, they
 * become required automatically (a proposed field counts as soon as it is present on the post object —
 * remember to keep it through normalizeCommunityPost in src/lib/supabase/community.server.ts).
 *
 * Interview / job review (board 'job-review'):
 *   회사 company            → companyId (catalog) OR location (free-text company name)
 *   지원 경로 channel        → at least one jobReviewTimeline[].platform
 *   전형 단계 stages         → every jobReviewTimeline[].stageLabel filled (≥1 entry)
 *   단계별 기간 durations    → ≥2 timeline entries and every entry has a YYYY-MM-DD date
 *   결과 outcome             → jobReviewOutcome
 *   인턴/정규직 type         → jobReviewType
 *   직무 role               → MISSING (proposed `jobReviewRole: string`). Note: `detail` stores the type label, not a role.
 *   질문 유형 question types → MISSING (proposed `jobReviewQuestionTypes: string[]`)
 *
 * Visa / OPT / green card (boards 'status', 'cpt-opt', 'visa', 'green-card'):
 *   비자 유형 visa type      → cptOptType
 *   학교 school (optional)   → not checked (authorSchoolName snapshot exists)
 *   신청일 filed date        → APPROXIMATED: a dated timeline entry with `submitted` filled
 *   승인일 approval date     → APPROXIMATED: a dated timeline entry with `resultReceived` filled
 *   준비 서류 documents      → APPROXIMATED: at least one timeline entry with `prepared` filled
 *   진행 단계 progress       → ≥2 timeline entries, every entry dated
 *   Proposed structured fields: `visaFiledDate` (YYYY-MM-DD), `visaApprovedDate` (YYYY-MM-DD),
 *   `visaDocuments: string[]` — when present they replace the approximations above.
 */

export const SPEC_FIELDS_MISSING = {
  interview: [
    { spec: '직무 (role)', proposedField: 'jobReviewRole', type: 'string' },
    { spec: '질문 유형 (question types)', proposedField: 'jobReviewQuestionTypes', type: 'string[]' },
  ],
  visa: [
    { spec: '신청일 (filed date)', proposedField: 'visaFiledDate', type: 'YYYY-MM-DD' },
    { spec: '승인일 (approval date)', proposedField: 'visaApprovedDate', type: 'YYYY-MM-DD' },
    { spec: '준비 서류 목록 (documents)', proposedField: 'visaDocuments', type: 'string[]' },
  ],
} as const

export type DetailCheck = { field: string; ok: boolean }
export type DetailReport = { complete: boolean; checks: DetailCheck[] }

type ExtendedPost = CommunityPost & {
  jobReviewRole?: string | null
  jobReviewQuestionTypes?: string[] | null
  visaFiledDate?: string | null
  visaApprovedDate?: string | null
  visaDocuments?: string[] | null
}

const DATE = /^\d{4}-\d{2}-\d{2}/
const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0
const filledList = (v: unknown) => Array.isArray(v) && v.some(filled)

/** Claim board for a community board id (null = this board never earns through claims). */
export function claimBoardFor(categoryId: string): ClaimBoard | null {
  if (isAnonymousBoard(categoryId)) return null
  if (categoryId === 'job-review') return 'interview'
  if (isStatusCommunityBoard(categoryId) || categoryId === 'status') return 'visa'
  if (categoryId === 'food') return 'food'
  return null
}

export function interviewDetailReport(raw: CommunityPost): DetailReport {
  const post = raw as ExtendedPost
  const timeline = post.jobReviewTimeline ?? []
  const checks: DetailCheck[] = [
    { field: 'company', ok: filled(post.companyId) || filled(post.location) },
    { field: 'channel', ok: timeline.some((e) => filled(e.platform)) },
    { field: 'stages', ok: timeline.length >= 1 && timeline.every((e) => filled(e.stageLabel)) },
    { field: 'durations', ok: timeline.length >= 2 && timeline.every((e) => DATE.test(String(e.date || ''))) },
    { field: 'outcome', ok: filled(post.jobReviewOutcome) },
    { field: 'type', ok: filled(post.jobReviewType) },
  ]
  if (post.jobReviewRole !== undefined) checks.push({ field: 'role', ok: filled(post.jobReviewRole) })
  if (post.jobReviewQuestionTypes !== undefined) {
    checks.push({ field: 'questionTypes', ok: filledList(post.jobReviewQuestionTypes) })
  }
  return { complete: checks.every((c) => c.ok), checks }
}

export function visaDetailReport(raw: CommunityPost): DetailReport {
  const post = raw as ExtendedPost
  const timeline = post.cptOptTimeline ?? []
  const dated = (e: { date: string }) => DATE.test(String(e.date || ''))
  const checks: DetailCheck[] = [
    { field: 'visaType', ok: filled(post.cptOptType) },
    {
      field: 'filedDate',
      ok: post.visaFiledDate !== undefined ? DATE.test(String(post.visaFiledDate || '')) : timeline.some((e) => dated(e) && filled(e.submitted)),
    },
    {
      field: 'approvedDate',
      ok:
        post.visaApprovedDate !== undefined
          ? DATE.test(String(post.visaApprovedDate || ''))
          : timeline.some((e) => dated(e) && filled(e.resultReceived)),
    },
    {
      field: 'documents',
      ok: post.visaDocuments !== undefined ? filledList(post.visaDocuments) : timeline.some((e) => filled(e.prepared)),
    },
    { field: 'progress', ok: timeline.length >= 2 && timeline.every(dated) },
  ]
  return { complete: checks.every((c) => c.ok), checks }
}

export function detailReportFor(board: ClaimBoard, post: CommunityPost): DetailReport | null {
  if (board === 'interview') return interviewDetailReport(post)
  if (board === 'visa') return visaDetailReport(post)
  return null
}

/** Plain text of a post used for length checks and similarity. */
export function postPlainText(post: CommunityPost): string {
  const parts: string[] = [post.title, htmlToPlainText(post.contentHtml || '')]
  for (const e of post.jobReviewTimeline ?? []) parts.push(htmlToPlainText(e.stageReviewHtml || ''))
  for (const e of post.cptOptTimeline ?? []) {
    parts.push(e.prepared, e.submitted, e.resultReceived, e.nextStep, htmlToPlainText(e.stageReviewHtml || ''))
  }
  if (post.jobReviewTips) parts.push(post.jobReviewTips)
  if (post.cptOptTips) parts.push(post.cptOptTips)
  for (const m of post.menuItems ?? []) parts.push(m.name, m.caption)
  return parts.filter(Boolean).join('\n').replace(/\s+/g, ' ').trim()
}

/** Body text only (food minimum length): the written review, without title and photo captions. */
export function postBodyText(post: CommunityPost): string {
  return htmlToPlainText(post.contentHtml || '').replace(/\s+/g, ' ').trim()
}

/** Photos on a food post: menu photos, gallery photos, or the thumbnail. */
export function foodPhotoCount(post: CommunityPost): number {
  const urls = new Set<string>()
  for (const m of post.menuItems ?? []) if (filled(m.imageUrl)) urls.add(m.imageUrl.trim())
  for (const g of post.galleryPhotos ?? []) if (filled(g.imageUrl)) urls.add(g.imageUrl.trim())
  if (urls.size === 0 && filled(post.thumbnailUrl)) urls.add(String(post.thumbnailUrl).trim())
  return urls.size
}

/** Company key for dedupe / first-company checks: catalog id, else the normalized free-text name. */
export function companyKeyOf(post: CommunityPost): string | null {
  if (filled(post.companyId)) return `id:${String(post.companyId).trim()}`
  const text = String(post.location || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return text ? `text:${text}` : null
}

/** Role key for the interview dedupe: the (future) role field, else the application type. */
export function roleKeyOf(post: CommunityPost): string {
  const role = (post as ExtendedPost).jobReviewRole
  if (filled(role)) return `role:${String(role).trim().toLowerCase().replace(/\s+/g, ' ')}`
  return `type:${post.jobReviewType ?? 'unknown'}`
}

/** Earliest YYYY-MM-DD on the post's timeline (the application date for the cycle), if any. */
export function earliestTimelineDate(post: CommunityPost): string | null {
  const dates = [...(post.jobReviewTimeline ?? []), ...(post.cptOptTimeline ?? [])]
    .map((e) => String(e.date || '').slice(0, 10))
    .filter((d) => DATE.test(d))
    .sort()
  return dates[0] ?? null
}
