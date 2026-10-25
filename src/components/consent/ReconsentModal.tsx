'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useBodyScrollLock } from '@hooks/useBodyScrollLock'
import { useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { PRIVACY_PATH, TERMS_PATH } from '@lib/consent/copy'
import type { ConsentStatus } from '@lib/consent/types'
import { useLocale, useT } from '@lib/i18n/client'

import { ConsentLocaleToggle } from './ConsentLocaleProvider'
import { TermsConsentFields } from './TermsConsentFields'

type ReconsentModalProps = {
  status: ConsentStatus
  onAgreed: () => Promise<void> | void
}

export function ReconsentModal({ status, onAgreed }: ReconsentModalProps) {
  const locale = useLocale()
  const t = useT('consent')
  const href = useCityPath()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  useBodyScrollLock(true)

  async function handleContinue() {
    if (!accepted) {
      setError(true)
      return
    }
    setSaving(true)
    setError(false)
    try {
      await onAgreed()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  // ERP는 영문·한국어 요약만 저장한다. 다른 언어는 번역된 기본 안내 + 영문 요약을 보여 준다.
  const summary =
    locale === 'ko'
      ? status.policy.summaryKo || t('reconsentBody', { brand: BRAND_CONFIG.name })
      : locale === 'en'
        ? status.policy.summaryEn || t('reconsentBody', { brand: BRAND_CONFIG.name })
        : t('reconsentBody', { brand: BRAND_CONFIG.name })
  const englishSummary =
    locale !== 'ko' && locale !== 'en' ? status.policy.summaryEn : ''

  return (
    <div
      className='fixed inset-0 z-[10050] flex items-end justify-center overscroll-none bg-black/55 p-4 sm:items-center'
      role='dialog'
      aria-modal='true'
      aria-labelledby='reconsent-title'
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.stopPropagation()
      }}
    >
      <div
        className='absolute inset-0 touch-none'
        aria-hidden
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.preventDefault()}
      />
      <div className='relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-[1.5rem] bg-white p-5 shadow-2xl touch-pan-y sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium tracking-[0.18em] text-[#8b95a7]'>
              {BRAND_CONFIG.name.toUpperCase()} NYC
            </p>
            <h2
              id='reconsent-title'
              className='mt-1 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'
            >
              {t('reconsentTitle')}
            </h2>
          </div>
          <ConsentLocaleToggle className='shrink-0' />
        </div>

        <p className='mt-4 text-[13px] leading-relaxed text-[var(--foreground)]'>
          {summary}
        </p>
        {englishSummary ? (
          <p lang='en' className='mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
            {englishSummary}
          </p>
        ) : null}

        <p className='mt-3 text-[12px] text-[#98a2b3]'>
          {t('reconsentVersions', {
            terms: status.policy.termsVersion,
            privacy: status.policy.privacyVersion,
          })}
        </p>

        <div className='mt-3 flex gap-3 text-[13px]'>
          <Link
            href={href(TERMS_PATH)}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold text-brand underline-offset-2 hover:underline'
          >
            {t('termsLink')}
          </Link>
          <Link
            href={href(PRIVACY_PATH)}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold text-brand underline-offset-2 hover:underline'
          >
            {t('privacyLink')}
          </Link>
        </div>

        <div className='mt-5'>
          <TermsConsentFields
            checked={accepted}
            onChange={(next) => {
              setAccepted(next)
              if (next) setError(false)
            }}
            error={error}
            showLocaleToggle={false}
          />
        </div>

        <button
          type='button'
          onClick={() => void handleContinue()}
          disabled={saving || !accepted}
          className='mt-4 min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,var(--brand-bright)_0%,var(--brand)_50%,var(--brand-deep)_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgb(var(--brand-rgb)/0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {saving ? t('saving') : t('reconsentConfirm')}
        </button>
      </div>
    </div>
  )
}
