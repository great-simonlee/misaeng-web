import type {
  CommunityBeenThere,
  CommunityBeenThereSummary,
  CommunityEngagementTargetType,
  CommunityRecommend,
  CommunityRecommendSummary,
  CommunityReport,
  CommunityReportInput,
  CommunityReportReason,
} from '@/types/nyc'
import {
  getLocalViewExtra,
  hasLocalReport,
  hasRecordedViewThisSession,
  listLocalBeenThere,
  listLocalRecommendsForTarget,
  markViewedThisSession,
  recordLocalView,
  removeLocalBeenThere,
  removeLocalRecommend,
  upsertLocalBeenThere,
  upsertLocalRecommend,
  upsertLocalReport,
} from '@lib/community/engagement.local'

export async function fetchPostRecommendSummary(
  postId: string,
  viewerUid?: string | null,
): Promise<CommunityRecommendSummary> {
  let remote: CommunityRecommend[] = []
  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(postId)}/recommend`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        recommends?: CommunityRecommend[]
        summary?: CommunityRecommendSummary
      }
      if (data.summary) {
        const local = listLocalRecommendsForTarget('post', postId)
        const localMine = viewerUid
          ? local.some((item) => item.authorUid === viewerUid)
          : false
        return {
          count: Math.max(data.summary.count, local.length),
          recommendedByMe: data.summary.recommendedByMe || localMine,
        }
      }
      if (Array.isArray(data.recommends)) remote = data.recommends
    }
  } catch {
    // 로컬 폴백
  }

  const local = listLocalRecommendsForTarget('post', postId)
  const merged = mergeRecommends(remote, local)
  return {
    count: merged.length,
    recommendedByMe: viewerUid
      ? merged.some((item) => item.authorUid === viewerUid)
      : false,
  }
}

export async function togglePostRecommendRequest(input: {
  postId: string
  boardId: string
  authorUid: string
}): Promise<CommunityRecommendSummary> {
  if (!input.authorUid) throw new Error('로그인이 필요해요.')

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(input.postId)}/recommend`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: input.boardId }),
      },
    )
    const data = (await res.json().catch(() => null)) as
      | {
          summary?: CommunityRecommendSummary
          recommend?: CommunityRecommend | null
          error?: string
          code?: string
        }
      | null

    if (res.ok && data?.summary) {
      if (data.recommend) upsertLocalRecommend(data.recommend)
      else
        removeLocalRecommend('post', input.postId, input.authorUid)
      return data.summary
    }

    if (
      res.status === 503 ||
      res.status === 401 ||
      input.postId.startsWith('mock-')
    ) {
      return toggleLocalPostRecommend(input)
    }

    throw new Error(data?.error || '추천에 실패했어요')
  } catch (error) {
    if (input.postId.startsWith('mock-') || error instanceof TypeError) {
      return toggleLocalPostRecommend(input)
    }
    throw error
  }
}

function toggleLocalPostRecommend(input: {
  postId: string
  boardId: string
  authorUid: string
}): CommunityRecommendSummary {
  const existing = listLocalRecommendsForTarget('post', input.postId)
  const mine = existing.find((item) => item.authorUid === input.authorUid)
  if (mine) {
    removeLocalRecommend('post', input.postId, input.authorUid)
    return {
      count: existing.length - 1,
      recommendedByMe: false,
    }
  }

  const now = Date.now()
  const recommend: CommunityRecommend = {
    id: `local_rec_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    targetType: 'post',
    targetId: input.postId,
    postId: input.postId,
    boardId: input.boardId,
    authorUid: input.authorUid,
    createdAt: now,
  }
  upsertLocalRecommend(recommend)
  return {
    count: existing.length + 1,
    recommendedByMe: true,
  }
}

export async function createCommunityReportRequest(input: {
  report: CommunityReportInput
  reporterUid: string
  reporterEmail: string
}): Promise<CommunityReport> {
  const { report, reporterUid, reporterEmail } = input
  if (!reporterUid || !reporterEmail) {
    throw new Error('로그인이 필요해요.')
  }
  if (!report.reason) throw new Error('신고 사유를 선택해 주세요.')

  if (
    hasLocalReport({
      targetType: report.targetType,
      targetId: report.targetId,
      reporterUid,
    })
  ) {
    throw new Error('이미 신고한 글/댓글이에요.')
  }

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(report.postId)}/report`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: report.targetType,
          targetId: report.targetId,
          boardId: report.boardId,
          reason: report.reason,
          detail: report.detail ?? null,
        }),
      },
    )
    const data = (await res.json().catch(() => null)) as
      | { report?: CommunityReport; error?: string; code?: string }
      | null

    if (res.ok && data?.report) {
      upsertLocalReport(data.report)
      return data.report
    }

    if (
      res.status === 503 ||
      res.status === 401 ||
      report.postId.startsWith('mock-')
    ) {
      return createLocalReport(report, reporterUid, reporterEmail)
    }

    throw new Error(data?.error || '신고에 실패했어요')
  } catch (error) {
    if (report.postId.startsWith('mock-') || error instanceof TypeError) {
      return createLocalReport(report, reporterUid, reporterEmail)
    }
    throw error
  }
}

function createLocalReport(
  report: CommunityReportInput,
  reporterUid: string,
  reporterEmail: string,
): CommunityReport {
  const now = Date.now()
  const created: CommunityReport = {
    id: `local_rpt_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    targetType: report.targetType,
    targetId: report.targetId,
    postId: report.postId,
    boardId: report.boardId,
    reason: report.reason as CommunityReportReason,
    detail: report.detail?.trim() || null,
    reporterUid,
    reporterEmail,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    resolutionNote: null,
  }
  return upsertLocalReport(created)
}

function mergeRecommends(
  remote: CommunityRecommend[],
  local: CommunityRecommend[],
): CommunityRecommend[] {
  const map = new Map<string, CommunityRecommend>()
  for (const item of [...remote, ...local]) {
    const key = `${item.targetType}:${item.targetId}:${item.authorUid}`
    const prev = map.get(key)
    if (!prev || item.createdAt >= prev.createdAt) map.set(key, item)
  }
  return Array.from(map.values())
}

export type { CommunityEngagementTargetType }

export function applyLocalViewCount(viewCount: number, postId: string): number {
  return (Number(viewCount) || 0) + getLocalViewExtra(postId)
}

export async function recordCommunityView(
  postId: string,
): Promise<{ viewCount: number } | { local: true } | null> {
  if (hasRecordedViewThisSession(postId)) return null

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(postId)}/view`,
      { method: 'POST' },
    )
    if (res.ok) {
      markViewedThisSession(postId)
      const data = (await res.json()) as { viewCount?: number }
      if (typeof data.viewCount === 'number') return { viewCount: data.viewCount }
      return { local: true }
    }
    if (res.status === 404 || res.status === 503 || postId.startsWith('mock-')) {
      recordLocalView(postId)
      return { local: true }
    }
  } catch {
    recordLocalView(postId)
    return { local: true }
  }
  return null
}

export async function fetchBeenThereSummary(
  postId: string,
  viewerUid?: string | null,
): Promise<CommunityBeenThereSummary> {
  let remote: CommunityBeenThere[] = []
  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(postId)}/been-there`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        visits?: CommunityBeenThere[]
        summary?: CommunityBeenThereSummary
      }
      if (data.summary) {
        const local = listLocalBeenThere(postId)
        const localMine = viewerUid
          ? local.some((item) => item.authorUid === viewerUid)
          : false
        return {
          count: Math.max(data.summary.count, local.length),
          beenThereByMe: data.summary.beenThereByMe || localMine,
        }
      }
      if (Array.isArray(data.visits)) remote = data.visits
    }
  } catch {
    // 로컬 폴백
  }

  const local = listLocalBeenThere(postId)
  const map = new Map<string, CommunityBeenThere>()
  for (const item of [...remote, ...local]) {
    map.set(item.authorUid, item)
  }
  const merged = Array.from(map.values())
  return {
    count: merged.length,
    beenThereByMe: viewerUid
      ? merged.some((item) => item.authorUid === viewerUid)
      : false,
  }
}

export async function toggleBeenThereRequest(input: {
  postId: string
  boardId: string
  authorUid: string
}): Promise<CommunityBeenThereSummary> {
  if (!input.authorUid) throw new Error('로그인이 필요해요.')
  if (input.boardId !== 'food') {
    throw new Error('맛집 게시글만 가봤어요를 표시할 수 있어요.')
  }

  try {
    const res = await fetch(
      `/api/community/${encodeURIComponent(input.postId)}/been-there`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: input.boardId }),
      },
    )
    const data = (await res.json().catch(() => null)) as
      | {
          summary?: CommunityBeenThereSummary
          visit?: CommunityBeenThere | null
          error?: string
        }
      | null

    if (res.ok && data?.summary) {
      if (data.visit) upsertLocalBeenThere(data.visit)
      else removeLocalBeenThere(input.postId, input.authorUid)
      return data.summary
    }

    if (
      res.status === 503 ||
      res.status === 401 ||
      input.postId.startsWith('mock-')
    ) {
      return toggleLocalBeenThere(input)
    }

    throw new Error(data?.error || '가봤어요에 실패했어요')
  } catch (error) {
    if (input.postId.startsWith('mock-') || error instanceof TypeError) {
      return toggleLocalBeenThere(input)
    }
    throw error
  }
}

function toggleLocalBeenThere(input: {
  postId: string
  boardId: string
  authorUid: string
}): CommunityBeenThereSummary {
  const existing = listLocalBeenThere(input.postId)
  const mine = existing.find((item) => item.authorUid === input.authorUid)
  if (mine) {
    removeLocalBeenThere(input.postId, input.authorUid)
    return { count: existing.length - 1, beenThereByMe: false }
  }

  const now = Date.now()
  upsertLocalBeenThere({
    id: `local_btn_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    postId: input.postId,
    boardId: input.boardId,
    authorUid: input.authorUid,
    createdAt: now,
  })
  return { count: existing.length + 1, beenThereByMe: true }
}
