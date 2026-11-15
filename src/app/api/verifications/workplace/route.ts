import { NextResponse } from 'next/server'

import { isParentAccount, PARENT_NOT_ALLOWED_CODE } from '@lib/community/schoolGate'
import { getClientIp, getClientUserAgent } from '@lib/consent/requestMeta'
import { isWorkplaceKind, WORKPLACE_COMPANY_MAX } from '@lib/constants/workplace'
import { getRequestLocale, getT } from '@lib/i18n/server'
import type { Translate } from '@lib/i18n/translate'
import {
  accountSuspendedResponse,
  getSupabaseProfile,
  upsertSupabaseProfile,
} from '@lib/supabase/profile.server'
import {
  ReviewDocStoreError,
  appendVerificationConsentLog,
  countRecentSubmissions,
  createSubmission,
  deleteVerificationObject,
  isReviewDocStoreConfigured,
  newId,
  patchSubmission,
  uploadVerificationObject,
} from '@lib/supabase/reviewVerification.server'
import {
  findLatestWorkplaceVerificationByUid,
  saveStoredWorkplaceVerification,
} from '@lib/supabase/workplaceVerification.server'
import {
  REVIEW_DOC_DAILY_LIMIT,
  REVIEW_DOC_MAX_BYTES,
  REVIEW_DOC_MAX_FILES,
  REVIEW_DOC_MIME_TYPES,
  WORKPLACE_DOC_BOARD,
  WORKPLACE_DOC_CONSENT_VERSION,
} from '@lib/verification/reviewDocs'
import { DocumentRejectedError, sanitizeDocument, type SanitizedDocument } from '@lib/verification/sanitizeDocument.server'
import { onWorkplaceRequestSubmitted } from '@lib/verification/workplace.server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// 3 files × 10 MB + re-encoding
export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000

function storeErrorResponse(error: unknown, t: Translate) {
  if (error instanceof ReviewDocStoreError && error.setupRequired) {
    return NextResponse.json({ error: t('reviewDocs.notReady'), code: 'SETUP_REQUIRED' }, { status: 503 })
  }
  console.error('Workplace documents error:', error)
  return NextResponse.json({ error: t('reviewDocs.failed') }, { status: 500 })
}

/** GET /api/verifications/workplace → 업로드 제한·동의 버전 (화면이 같은 값을 쓰게) */
export async function GET() {
  return NextResponse.json({
    limits: {
      maxFiles: REVIEW_DOC_MAX_FILES,
      maxBytes: REVIEW_DOC_MAX_BYTES,
      consentVersion: WORKPLACE_DOC_CONSENT_VERSION,
      mimeTypes: REVIEW_DOC_MIME_TYPES,
      companyMax: WORKPLACE_COMPANY_MAX,
    },
  })
}

/**
 * POST /api/verifications/workplace (multipart/form-data) — 재직·전 직장 서류로 직장 인증 (1.0.7)
 *   workplaceKind=current|former, companyName, consent=true, consentVersion=<WORKPLACE_DOC_CONSENT_VERSION>,
 *   files (1–3; jpg/png/pdf ≤ 10 MB each), source=web|ios|android
 * → 201 { ok, profile: { workplaceStatus: 'pending', workplaceKind, workplaceMethod: 'documents', ... }, requestId, submissionId }
 * 같은 파이프라인 (verification-private, 메타데이터 제거, 하루 5번, 결정 72시간 뒤 / 최대 7일 삭제). 결정은 ERP 직장 인증 대기열.
 */
export async function POST(request: Request) {
  const locale = await getRequestLocale(request)
  const t = await getT(locale, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return NextResponse.json({ error: t('common.loginRequired') }, { status: 401 })
  const suspended = await accountSuspendedResponse(user.uid, t)
  if (suspended) return suspended
  if (!isReviewDocStoreConfigured()) {
    return NextResponse.json({ error: t('common.supabaseNotConfigured') }, { status: 503 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > REVIEW_DOC_MAX_FILES * REVIEW_DOC_MAX_BYTES + 512 * 1024) {
    return NextResponse.json({ error: t('reviewDocs.fileTooLarge') }, { status: 413 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: t('reviewDocs.invalidRequest') }, { status: 400 })
  }

  const workplaceKind = String(form.get('workplaceKind') || '').trim()
  const companyName = String(form.get('companyName') || '').trim().replace(/\s+/g, ' ')
  const consent = String(form.get('consent') || '').trim() === 'true'
  const consentVersion = String(form.get('consentVersion') || '').trim()
  const source = String(form.get('source') || 'web').trim()
  const files = [...form.getAll('files'), ...form.getAll('file')].filter((f): f is File => f instanceof File)

  if (!consent || consentVersion !== WORKPLACE_DOC_CONSENT_VERSION) {
    return NextResponse.json({ error: t('reviewDocs.consentRequired'), code: 'CONSENT_REQUIRED' }, { status: 400 })
  }
  if (!isWorkplaceKind(workplaceKind)) {
    return NextResponse.json({ error: t('reviewDocs.invalidRequest') }, { status: 400 })
  }
  if (companyName.length < 2) return NextResponse.json({ error: t('verification.companyNameRequired') }, { status: 400 })
  if (companyName.length > WORKPLACE_COMPANY_MAX) {
    return NextResponse.json({ error: t('verification.companyNameTooLong', { max: WORKPLACE_COMPANY_MAX }) }, { status: 400 })
  }
  if (files.length === 0) return NextResponse.json({ error: t('reviewDocs.fileRequired') }, { status: 400 })
  if (files.length > REVIEW_DOC_MAX_FILES) {
    return NextResponse.json({ error: t('reviewDocs.tooManyFiles', { max: REVIEW_DOC_MAX_FILES }) }, { status: 400 })
  }
  if (files.some((f) => f.size > REVIEW_DOC_MAX_BYTES)) {
    return NextResponse.json({ error: t('reviewDocs.fileTooLarge') }, { status: 413 })
  }

  try {
    const profile = await getSupabaseProfile(user.uid)
    if (isParentAccount(profile)) {
      return NextResponse.json({ error: t('parents.verificationNotAllowed'), code: PARENT_NOT_ALLOWED_CODE }, { status: 403 })
    }
    if (profile?.workplaceStatus === 'approved') {
      return NextResponse.json({ error: t('verification.workplaceAlreadyApproved'), code: 'ALREADY_VERIFIED' }, { status: 409 })
    }
    const latest = await findLatestWorkplaceVerificationByUid(user.uid)
    if (profile?.workplaceStatus === 'pending' || latest?.status === 'pending') {
      return NextResponse.json({ error: t('verification.workplacePending'), code: 'ALREADY_PENDING' }, { status: 409 })
    }
    if ((await countRecentSubmissions(user.uid, new Date(Date.now() - DAY).toISOString())) >= REVIEW_DOC_DAILY_LIMIT) {
      return NextResponse.json({ error: t('reviewDocs.dailyLimit') }, { status: 429 })
    }

    // 바이트로 형식 확인, 메타데이터 제거(다시 인코딩), 해시. 모두 통과하기 전에는 아무것도 저장하지 않는다
    const cleaned: SanitizedDocument[] = []
    for (const file of files) {
      try {
        cleaned.push(await sanitizeDocument(Buffer.from(await file.arrayBuffer()), REVIEW_DOC_MAX_BYTES))
      } catch (error) {
        if (error instanceof DocumentRejectedError) {
          const key =
            error.code === 'heic'
              ? 'reviewDocs.heicNotSupported'
              : error.code === 'tooLarge'
                ? 'reviewDocs.fileTooLarge'
                : error.code === 'invalidImage'
                  ? 'reviewDocs.invalidImage'
                  : 'reviewDocs.unsupportedType'
          return NextResponse.json({ error: t(key) }, { status: error.code === 'tooLarge' ? 413 : 415 })
        }
        throw error
      }
    }

    const consentLogId = await appendVerificationConsentLog({
      userId: user.uid,
      consentVersion,
      uiLanguage: locale,
      source: source === 'ios' || source === 'android' ? source : 'web',
      postId: null,
      ipAddress: getClientIp(request),
      userAgent: getClientUserAgent(request),
    })

    const submissionId = newId()
    const uploadedAt = new Date()
    const stored = cleaned.map((doc) => {
      const id = newId()
      return { id, doc, storagePath: `${submissionId}/${id}.${doc.extension}` }
    })
    const kind = workplaceKind === 'former' ? 'workplace_former' : 'workplace_current'
    await createSubmission({
      id: submissionId,
      userId: user.uid,
      postId: null,
      board: WORKPLACE_DOC_BOARD,
      kind,
      uploadedAt,
      consentLogId,
      consentVersion,
      files: stored.map((s) => ({
        id: s.id,
        storagePath: s.storagePath,
        mimeType: s.doc.mimeType,
        sizeBytes: s.doc.bytes.length,
        sha256: s.doc.sha256,
      })),
    })
    try {
      for (const s of stored) await uploadVerificationObject(s.storagePath, s.doc.bytes, s.doc.mimeType)
    } catch (error) {
      await patchSubmission(submissionId, { status: 'withdrawn' }).catch(() => null)
      for (const s of stored) await deleteVerificationObject(s.storagePath).catch(() => undefined)
      throw error
    }

    // ERP 직장 인증 대기열에 들어가는 요청 (회사 이메일 요청과 같은 저장소, method 'documents')
    const now = Date.now()
    const savedRequest = await saveStoredWorkplaceVerification({
      id: `${user.uid}-${now}`,
      uid: user.uid,
      userEmail: user.email || profile?.email || '',
      userNickname: profile?.nickname?.trim() || null,
      workEmail: '',
      companyName,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      reviewedByEmail: null,
      reviewedAt: null,
      rejectReason: null,
      method: 'documents',
      workplaceKind,
      submissionId,
    })
    const saved = await upsertSupabaseProfile(user.uid, {
      workplaceCompanyName: companyName,
      workplaceStatus: 'pending',
      workplaceKind,
      workplaceMethod: 'documents',
      workplaceSubmissionId: submissionId,
      workplaceRequestId: savedRequest.id,
      workplaceRejectReason: null,
      workplaceReviewedAt: null,
      workplaceReviewedByEmail: null,
    })
    await onWorkplaceRequestSubmitted(savedRequest)

    return NextResponse.json(
      {
        ok: true,
        requestId: savedRequest.id,
        submissionId,
        canWriteHeld: true,
        profile: {
          workplaceStatus: saved.workplaceStatus,
          workplaceKind: saved.workplaceKind,
          workplaceMethod: saved.workplaceMethod,
          workplaceCompanyName: saved.workplaceCompanyName,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return storeErrorResponse(error, t)
  }
}
