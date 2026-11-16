import type { PublicPosting } from '@lib/company/postings'

/** 지원 가능 학력 (앱 필터): bachelor | master | master_phd | phd | any */
export type MinDegree = 'bachelor' | 'master' | 'master_phd' | 'phd' | 'any'

const BACHELOR = /bachelor|undergrad|학사|학부|\bb\.?s\.?\b|\bb\.?a\.?\b/i
const MASTER = /master|\bm\.?s\.?\b|\bmba\b|\bm\.?eng\b|graduate (program|degree|student)|석사|대학원/i
const PHD = /ph\.?\s?d|doctora|박사/i

/**
 * 제목과 자격 요건에서 읽은 가장 낮은 지원 가능 학력. 학사 언급이 있으면 학사 이상("학사 또는 대학원 재학"),
 * 없으면 석사·박사 순. 앱(iOS JobPosting.minDegree, Android JobPosting.minDegree)과 같은 규칙.
 */
export function minDegreeOf(title: string, qualifications: string[], stored?: unknown): MinDegree {
  // 요약할 때 Claude 가 정한 값 (ellieo-erp MIN_DEGREES). none(학력 무관)·unspecified 는 앱의 '무관'
  if (stored === 'bachelor' || stored === 'master' || stored === 'master_phd' || stored === 'phd') return stored
  if (stored === 'none') return 'any'
  const text = [title, ...qualifications].join(' \n ')
  if (BACHELOR.test(text)) return 'bachelor'
  const master = MASTER.test(text)
  const phd = PHD.test(text)
  return master && phd ? 'master_phd' : master ? 'master' : phd ? 'phd' : 'any'
}

/** 목록용 공고 (?view=list): 카드와 필터에 쓰는 값만. 긴 요약(소개·자격·우대·복지·지원 팁)은 상세(/api/postings/{id})에서. */
export type ListPosting = Omit<PublicPosting, 'summary'> & {
  summary: Pick<PublicPosting['summary'], 'compensation' | 'earlyApply' | 'alwaysOpen' | 'degree'>
  /** 요약이 빠진 목록용 공고 (앱이 상세에서 전체를 다시 받는다) */
  light: true
}

export function toListPosting(posting: PublicPosting): ListPosting {
  const { summary, ...rest } = posting
  return {
    ...rest,
    summary: {
      compensation: summary.compensation,
      earlyApply: summary.earlyApply,
      alwaysOpen: summary.alwaysOpen,
      degree: summary.degree,
    },
    light: true,
  }
}
