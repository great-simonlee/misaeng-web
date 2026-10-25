import type { Translate } from '@lib/i18n/translate'
import type { CommunityReportReason } from '@/types/nyc'

/**
 * 신고 사유 코드 (웹 UI · ERP 공통 코드).
 * 화면 문구는 `t('community.report.reasons.<value>.label' | '.description')`.
 */
export const COMMUNITY_REPORT_REASONS: { value: CommunityReportReason }[] = [
  { value: 'spam' },
  { value: 'abuse' },
  { value: 'inappropriate' },
  { value: 'misinformation' },
  { value: 'privacy' },
  { value: 'other' },
]

/** `t`는 community 네임스페이스 번역기 (`useT('community')`) */
export function getReportReasonLabel(
  reason: CommunityReportReason,
  t: Translate,
): string {
  return COMMUNITY_REPORT_REASONS.some((item) => item.value === reason)
    ? t(`report.reasons.${reason}.label`)
    : reason
}
