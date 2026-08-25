import type {
  CommunityBeenThere,
  CommunityRecommend,
  CommunityReport,
} from '@/types/nyc'

const RECOMMEND_KEY = 'misaeng.nyc.communityRecommends.v1'
const REPORT_KEY = 'misaeng.nyc.communityReports.v1'
const BEEN_THERE_KEY = 'misaeng.nyc.communityBeenThere.v1'
const VIEW_EXTRA_KEY = 'misaeng.nyc.communityViewExtras.v1'
const VIEWED_SESSION_PREFIX = 'misaeng.nyc.viewed.'

function readList<T>(key: string, guard: (v: unknown) => v is T): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(guard)
  } catch {
    return []
  }
}

function writeList(key: string, items: unknown[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(items))
}

function isRecommend(value: unknown): value is CommunityRecommend {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.targetId === 'string' &&
    typeof item.postId === 'string' &&
    typeof item.authorUid === 'string'
  )
}

function isReport(value: unknown): value is CommunityReport {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.targetId === 'string' &&
    typeof item.postId === 'string' &&
    typeof item.reporterUid === 'string' &&
    typeof item.reason === 'string'
  )
}

export function listLocalRecommends(postId: string): CommunityRecommend[] {
  return readList(RECOMMEND_KEY, isRecommend).filter(
    (item) => item.postId === postId,
  )
}

export function listLocalRecommendsForTarget(
  targetType: CommunityRecommend['targetType'],
  targetId: string,
): CommunityRecommend[] {
  return readList(RECOMMEND_KEY, isRecommend).filter(
    (item) => item.targetType === targetType && item.targetId === targetId,
  )
}

export function upsertLocalRecommend(
  recommend: CommunityRecommend,
): CommunityRecommend {
  const all = readList(RECOMMEND_KEY, isRecommend)
  const next = [
    ...all.filter(
      (item) =>
        !(
          item.targetType === recommend.targetType &&
          item.targetId === recommend.targetId &&
          item.authorUid === recommend.authorUid
        ),
    ),
    recommend,
  ]
  writeList(RECOMMEND_KEY, next)
  return recommend
}

export function removeLocalRecommend(
  targetType: CommunityRecommend['targetType'],
  targetId: string,
  authorUid: string,
) {
  const all = readList(RECOMMEND_KEY, isRecommend)
  writeList(
    RECOMMEND_KEY,
    all.filter(
      (item) =>
        !(
          item.targetType === targetType &&
          item.targetId === targetId &&
          item.authorUid === authorUid
        ),
    ),
  )
}

export function listLocalReports(): CommunityReport[] {
  return readList(REPORT_KEY, isReport)
}

export function hasLocalReport(input: {
  targetType: CommunityReport['targetType']
  targetId: string
  reporterUid: string
}): boolean {
  return listLocalReports().some(
    (item) =>
      item.targetType === input.targetType &&
      item.targetId === input.targetId &&
      item.reporterUid === input.reporterUid &&
      item.status !== 'dismissed',
  )
}

export function upsertLocalReport(report: CommunityReport): CommunityReport {
  const all = listLocalReports()
  const next = [...all.filter((item) => item.id !== report.id), report]
  writeList(REPORT_KEY, next)
  return report
}

function isBeenThere(value: unknown): value is CommunityBeenThere {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.postId === 'string' &&
    typeof item.authorUid === 'string'
  )
}

export function listLocalBeenThere(postId: string): CommunityBeenThere[] {
  return readList(BEEN_THERE_KEY, isBeenThere).filter(
    (item) => item.postId === postId,
  )
}

export function upsertLocalBeenThere(
  visit: CommunityBeenThere,
): CommunityBeenThere {
  const all = readList(BEEN_THERE_KEY, isBeenThere)
  const next = [
    ...all.filter(
      (item) =>
        !(item.postId === visit.postId && item.authorUid === visit.authorUid),
    ),
    visit,
  ]
  writeList(BEEN_THERE_KEY, next)
  return visit
}

export function removeLocalBeenThere(postId: string, authorUid: string) {
  const all = readList(BEEN_THERE_KEY, isBeenThere)
  writeList(
    BEEN_THERE_KEY,
    all.filter(
      (item) => !(item.postId === postId && item.authorUid === authorUid),
    ),
  )
}

function readViewExtras(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(VIEW_EXTRA_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

export function getLocalViewExtra(postId: string): number {
  return Math.max(0, Math.floor(Number(readViewExtras()[postId]) || 0))
}

export function hasRecordedViewThisSession(postId: string): boolean {
  if (typeof window === 'undefined') return true
  return window.sessionStorage.getItem(`${VIEWED_SESSION_PREFIX}${postId}`) === '1'
}

export function markViewedThisSession(postId: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(`${VIEWED_SESSION_PREFIX}${postId}`, '1')
}

export function recordLocalView(postId: string): number {
  if (typeof window === 'undefined') return 0
  if (hasRecordedViewThisSession(postId)) return getLocalViewExtra(postId)
  markViewedThisSession(postId)
  const extras = readViewExtras()
  extras[postId] = getLocalViewExtra(postId) + 1
  window.localStorage.setItem(VIEW_EXTRA_KEY, JSON.stringify(extras))
  return extras[postId]
}
