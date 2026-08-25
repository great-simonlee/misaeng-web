import type { CommunityReportReason } from '@/types/nyc'

/** 신고 사유 옵션 (웹 UI · ERP 공통 코드) */
export const COMMUNITY_REPORT_REASONS: {
  value: CommunityReportReason
  label: string
  description: string
}[] = [
  {
    value: 'spam',
    label: '스팸 · 광고',
    description: '홍보, 도배, 무관한 링크 등',
  },
  {
    value: 'abuse',
    label: '욕설 · 괴롭힘',
    description: '비방, 혐오, 위협적인 표현',
  },
  {
    value: 'inappropriate',
    label: '부적절한 내용',
    description: '선정적·폭력적·커뮤니티 가이드 위반',
  },
  {
    value: 'misinformation',
    label: '허위 · 사기 의심',
    description: '거짓 정보, 사기·피싱 의심',
  },
  {
    value: 'privacy',
    label: '개인정보 노출',
    description: '동의 없는 연락처·사진·신상 공개',
  },
  {
    value: 'other',
    label: '기타',
    description: '위에 해당하지 않는 사유',
  },
]

export function getReportReasonLabel(reason: CommunityReportReason): string {
  return (
    COMMUNITY_REPORT_REASONS.find((item) => item.value === reason)?.label ||
    reason
  )
}
