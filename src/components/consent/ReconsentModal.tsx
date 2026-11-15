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
  /** "동의하지 않아요" → confirm → sign out (same as the apps) */
  onDeclined: () => Promise<void> | void
}

export function ReconsentModal({ status, onAgreed, onDeclined }: ReconsentModalProps) {
  const locale = useLocale()
  const t = useT('consent')
  const href = useCityPath()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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

  async function handleDecline() {
    setSigningOut(true)
    try {
      await onDeclined()
    } finally {
      setSigningOut(false)
      setConfirmDecline(false)
    }
  }

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
      <div className='relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white p-5 shadow-2xl touch-pan-y sm:p-6'>
        {/* Icon + eyebrow + version (same layout as the apps) */}
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-brand/10 text-brand' aria-hidden>
              <svg viewBox='0 0 24 24' className='size-[22px]' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round'>
                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5' />
                <path d='M14 2v6h6M20 8v3' />
                <circle cx='16.5' cy='16.5' r='3' />
                <path d='m21 21-2.4-2.4' />
              </svg>
            </span>
            <div className='min-w-0'>
              <p className='text-[12px] font-semibold text-brand'>{t('reconsentEyebrow')}</p>
              <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                {t('reconsentVersion', { version: status.policy.termsVersion })}
              </p>
            </div>
          </div>
          <ConsentLocaleToggle className='shrink-0' />
        </div>
        <h2
          id='reconsent-title'
          className='mt-4 text-[1.3rem] font-bold tracking-[-0.02em] text-[var(--foreground)]'
        >
          {t('reconsentTitle')}
        </h2>

        {/* What changed, on a soft card */}
        <div className='mt-3 rounded-2xl bg-[var(--surface)] p-4'>
          <p className='text-[14px] leading-[1.6] text-[var(--muted-foreground)]'>{summary}</p>
          {englishSummary ? (
            <p lang='en' className='mt-2 text-[12px] leading-relaxed text-[var(--muted)]'>
              {englishSummary}
            </p>
          ) : null}
        </div>

        {/* The documents, as rows */}
        <div className='mt-3 overflow-hidden rounded-2xl border border-[var(--border)]'>
          {[
            { path: TERMS_PATH, label: t('reconsentViewTerms') },
            { path: PRIVACY_PATH, label: t('reconsentViewPrivacy') },
          ].map((row, i) => (
            <Link
              key={row.path}
              href={href(row.path)}
              target='_blank'
              rel='noopener noreferrer'
              className={`flex min-h-[50px] items-center gap-3 px-3.5 text-[15px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)] ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
            >
              <span className='flex-1'>{row.label}</span>
              <span className='text-[var(--muted)]' aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>

        <div className='mt-4'>
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
          disabled={saving || !accepted || signingOut}
          className='mt-4 min-h-[52px] w-full rounded-full bg-[linear-gradient(135deg,var(--brand-bright)_0%,var(--brand)_50%,var(--brand-deep)_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgb(var(--brand-rgb)/0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {saving ? t('saving') : t('reconsentConfirm')}
        </button>
        <button
          type='button'
          onClick={() => setConfirmDecline(true)}
          disabled={saving || signingOut}
          className='mt-1 min-h-[44px] w-full text-[14px] font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] disabled:opacity-50'
        >
          {t('reconsentDecline')}
        </button>

        {confirmDecline ? (
          <div className='absolute inset-0 flex items-center justify-center rounded-[1.75rem] bg-black/35 p-5'>
            <div role='alertdialog' aria-labelledby='reconsent-decline-title' className='w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl'>
              <p id='reconsent-decline-title' className='text-[17px] font-bold text-[var(--foreground)]'>
                {t('reconsentDeclineTitle')}
              </p>
              <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
                {t('reconsentDeclineBody', { brand: BRAND_CONFIG.name })}
              </p>
              <div className='mt-4 flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setConfirmDecline(false)}
                  disabled={signingOut}
                  className='min-h-[40px] rounded-full px-4 text-[14px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface)]'
                >
                  {t('reconsentDeclineCancel')}
                </button>
                <button
                  type='button'
                  onClick={() => void handleDecline()}
                  disabled={signingOut}
                  className='min-h-[40px] rounded-full bg-red-600 px-4 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                >
                  {t('reconsentDeclineConfirm')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
