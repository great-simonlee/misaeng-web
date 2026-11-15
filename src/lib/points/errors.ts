import { ApiMessageError } from '@lib/i18n/apiError'
import type { TranslateParams } from '@lib/i18n/translate'

/**
 * A user-facing points error. `key` is relative to the `api` namespace (`points.insufficient`),
 * so routes translate it with `apiErrorMessage(t, error, ...)` where `t = await getRequestT(request, 'api')`.
 */
export class PointsError extends ApiMessageError {
  constructor(
    message: string,
    key: string,
    readonly status = 400,
    params?: TranslateParams,
    readonly code: string = key.replace(/^points\./, '').replace(/\W+/g, '_').toUpperCase(),
  ) {
    super(message, key, params)
    this.name = 'PointsError'
  }
}

export const pointsErrors = {
  notConfigured: () => new PointsError('Points tables are not set up', 'points.notConfigured', 503, undefined, 'POINTS_NOT_CONFIGURED'),
  notActive: () => new PointsError('Points ledger is not active yet', 'points.notActive', 409, undefined, 'POINTS_NOT_ACTIVE'),
  insufficient: (required: number, available: number) =>
    new PointsError('Not enough points', 'points.insufficient', 409, { required, available }, 'INSUFFICIENT_POINTS'),
  monthlyCap: () => new PointsError('Monthly limit reached', 'points.monthlyCap', 409, undefined, 'MONTHLY_CAP'),
  disabled: () => new PointsError('Feature disabled', 'points.featureDisabled', 409, undefined, 'FEATURE_DISABLED'),
  identityRequired: () =>
    new PointsError('School or work verification required', 'points.identityRequired', 403, undefined, 'IDENTITY_VERIFICATION_REQUIRED'),
  /** 학부모 계정: 커피챗·커리어 질문·멘토 등록·퀴즈 불가 (1.0.7) */
  parentNotAllowed: () =>
    new PointsError('Parent accounts cannot do this', 'points.parentNotAllowed', 403, undefined, 'PARENT_NOT_ALLOWED'),
  verificationRequired: () =>
    new PointsError('Verified account required', 'points.verificationRequired', 403, undefined, 'VERIFICATION_REQUIRED'),
}
