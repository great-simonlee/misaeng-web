'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import {
  ANONYMOUS_WRITING_GUIDELINE_KEYS,
  COMMUNITY_WRITING_GUIDELINE_KEYS,
} from '@lib/constants/communityGuidelines'
import { useT } from '@lib/i18n/client'

const ORIENTATION_STEP_IDS = ['step1', 'step2', 'step3'] as const

/** `reviews.orientation.<kind>.step1.title` 등에서 작성 가이드 문구를 읽는다 */
function useOrientationSteps(kind: 'cptOpt' | 'jobReview'): OrientationStep[] {
  const t = useT('reviews')
  return ORIENTATION_STEP_IDS.map((id, index) => ({
    eyebrow: `STEP ${index + 1}`,
    title: t(`orientation.${kind}.${id}.title`),
    body: t(`orientation.${kind}.${id}.body`),
  }))
}

type OrientationStep = {
  eyebrow: string
  title: string
  body: string
}
type WriteConsentSource = 'status' | 'job-review' | 'roommate' | 'anonymous'

type WriteConsentModalProps = {
  open: boolean
  agreeing: boolean
  error?: string | null
  onAgree: () => void
  steps?: readonly OrientationStep[]
  /** 공통 안내 뒤에 붙일 추가 안내 (`community` 네임스페이스 키) */
  extraGuidelines?: readonly string[]
  eyebrow?: string
  titleId: string
  listHref?: string
}

function WriteConsentModal({
  open,
  agreeing,
  error,
  onAgree,
  steps = [],
  extraGuidelines = [],
  eyebrow,
  titleId,
  listHref,
}: WriteConsentModalProps) {
  const t = useT('reviews')
  const tCommunity = useT('community')
  useBodyScrollLock(open)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className='fixed inset-0 z-[10050] flex items-end justify-center overscroll-none sm:items-center sm:p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.stopPropagation()
      }}
    >
      <div
        className='absolute inset-0 touch-none bg-black/45 backdrop-blur-[2px]'
        aria-hidden
      />
      <div className='relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.14)] sm:rounded-[1.5rem]'>
        <div className='flex shrink-0 flex-col items-center pt-3 sm:pt-4'>
          <span
            className='h-1 w-10 rounded-full bg-[#e2e5ea] sm:hidden'
            aria-hidden
          />
          <div className='mt-3 w-full px-5'>
            <p className='text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)]'>
              {eyebrow ?? t('orientation.defaultEyebrow')}
            </p>
            <h2
              id={titleId}
              className='mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]'
            >
              {t('orientation.title')}
            </h2>
            <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]'>
              {steps.length > 0
                ? t('orientation.subtitleWithGuide')
                : t('orientation.subtitle')}
            </p>
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-4'>
          {steps.length > 0 ? (
            <section>
              <p className='text-[12px] font-semibold text-[var(--foreground)]'>
                {t('orientation.guideTitle')}
              </p>
              <ol className='mt-2 space-y-2'>
                {steps.map((step) => (
                  <li
                    key={step.eyebrow}
                    className='rounded-xl bg-[#f7f8fa] px-3.5 py-3 ring-1 ring-black/[0.04]'
                  >
                    <p className='text-[11px] font-semibold tracking-[0.12em] text-[var(--brand)]'>
                      {step.eyebrow}
                    </p>
                    <p className='mt-1 text-[14px] font-semibold text-[var(--foreground)]'>
                      {step.title}
                    </p>
                    <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted)]'>
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className={steps.length > 0 ? 'mt-5' : undefined}>
            <p className='text-[12px] font-semibold text-[var(--foreground)]'>
              {t('orientation.communityTitle')}
            </p>
            <ul className='mt-2 space-y-1.5'>
              {[
                ...COMMUNITY_WRITING_GUIDELINE_KEYS.map(
                  (key) => `guidelines.common.${key}`,
                ),
                ...extraGuidelines,
              ].map(
                (item) => (
                  <li
                    key={item}
                    className='flex gap-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'
                  >
                    <span
                      className='mt-1.5 size-1 shrink-0 rounded-full bg-[var(--muted)]'
                      aria-hidden
                    />
                    <span>{tCommunity(item)}</span>
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>

        <div className='shrink-0 border-t border-black/[0.05] px-5 pt-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))]'>
          {error ? (
            <p role='alert' className='mb-2 text-center text-[12px] font-medium text-red-600'>
              {error}
            </p>
          ) : null}
          <button
            type='button'
            onClick={onAgree}
            disabled={agreeing}
            className='min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,var(--brand-bright)_0%,var(--brand)_50%,var(--brand-deep)_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgb(var(--brand-rgb)/0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {agreeing ? t('orientation.saving') : t('orientation.agree')}
          </button>
          {listHref ? (
            <Link
              href={listHref}
              className='mt-3 flex min-h-11 items-center justify-center text-[13px] font-medium text-[var(--muted)] underline-offset-2 hover:underline'
            >
              {t('orientation.backToList')}
            </Link>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function useWriteConsent(enabled: boolean, source: WriteConsentSource) {
  const t = useT('reviews')
  const [required, setRequired] = useState(false)
  const [ready, setReady] = useState(!enabled)
  const [agreeing, setAgreeing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setRequired(false)
      setReady(true)
      return
    }

    let cancelled = false
    setReady(false)
    void fetch('/api/community/write-consent', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          required?: boolean
        } | null
        if (cancelled) return
        setRequired(Boolean(data?.required))
      })
      .catch(() => {
        if (!cancelled) setRequired(true)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  async function agree() {
    if (agreeing) return
    setAgreeing(true)
    setError(null)
    try {
      const res = await fetch('/api/community/write-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      if (!res.ok) {
        throw new Error('write consent save failed')
      }
      setRequired(false)
    } catch {
      setError(t('orientation.saveFailed'))
    } finally {
      setAgreeing(false)
    }
  }

  return {
    open: enabled && ready && required,
    agree,
    agreeing,
    error,
  }
}

type WriteConsentModalExportProps = {
  open: boolean
  agreeing?: boolean
  error?: string | null
  onClose: () => void
  listHref?: string
}

/** Status 글쓰기: 미동의 시 가이드·안내 */
export function CptOptWriteOrientationModal({
  open,
  agreeing = false,
  error,
  onClose,
  listHref,
}: WriteConsentModalExportProps) {
  const steps = useOrientationSteps('cptOpt')
  return (
    <WriteConsentModal
      open={open}
      agreeing={agreeing}
      error={error}
      onAgree={onClose}
      steps={steps}
      titleId='status-write-consent-title'
      listHref={listHref}
    />
  )
}

export function useStatusWriteOrientation(enabled: boolean) {
  return useWriteConsent(enabled, 'status')
}

export function JobReviewWriteOrientationModal({
  open,
  agreeing = false,
  error,
  onClose,
  listHref,
}: WriteConsentModalExportProps) {
  const steps = useOrientationSteps('jobReview')
  return (
    <WriteConsentModal
      open={open}
      agreeing={agreeing}
      error={error}
      onAgree={onClose}
      steps={steps}
      titleId='job-review-write-consent-title'
      listHref={listHref}
    />
  )
}

export function useJobReviewWriteOrientation(enabled: boolean) {
  return useWriteConsent(enabled, 'job-review')
}

export function RoommateWriteOrientationModal({
  open,
  agreeing = false,
  error,
  onClose,
  listHref,
}: WriteConsentModalExportProps) {
  const t = useT('reviews')
  return (
    <WriteConsentModal
      open={open}
      agreeing={agreeing}
      error={error}
      onAgree={onClose}
      eyebrow={t('orientation.roommateEyebrow')}
      titleId='roommate-write-consent-title'
      listHref={listHref}
    />
  )
}

export function useRoommateWriteOrientation(enabled: boolean) {
  return useWriteConsent(enabled, 'roommate')
}

export function AnonymousWriteOrientationModal({
  open,
  agreeing = false,
  error,
  onClose,
  listHref,
}: WriteConsentModalExportProps) {
  const t = useT('reviews')
  return (
    <WriteConsentModal
      open={open}
      agreeing={agreeing}
      error={error}
      onAgree={onClose}
      extraGuidelines={ANONYMOUS_WRITING_GUIDELINE_KEYS.map(
        (key) => `guidelines.anonymous.${key}`,
      )}
      eyebrow={t('orientation.anonymousEyebrow')}
      titleId='anonymous-write-consent-title'
      listHref={listHref}
    />
  )
}

export function useAnonymousWriteOrientation(enabled: boolean) {
  return useWriteConsent(enabled, 'anonymous')
}
