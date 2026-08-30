'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CONSENT_COPY } from '@lib/consent/copy'
import {
  PRIVACY_HREF,
  TERMS_HREF,
} from '@lib/consent/copy'
import type { ConsentStatus } from '@lib/consent/types'

import { BilingualStack } from './BilingualStack'
import {
  ConsentLocaleToggle,
  useConsentLocale,
} from './ConsentLocaleProvider'
import { TermsConsentFields } from './TermsConsentFields'

type ReconsentModalProps = {
  status: ConsentStatus
  onAgreed: () => Promise<void> | void
}

export function ReconsentModal({ status, onAgreed }: ReconsentModalProps) {
  const { locale } = useConsentLocale()
  const copy = CONSENT_COPY[locale]
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

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

  return (
    <div
      className='fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center'
      role='dialog'
      aria-modal='true'
      aria-labelledby='reconsent-title'
    >
      <div className='max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-2xl sm:p-6'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-[11px] font-medium tracking-[0.18em] text-[#8b95a7]'>
              MISAENG NYC
            </p>
            <h2
              id='reconsent-title'
              className='mt-1 text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'
            >
              {CONSENT_COPY.en.reconsentTitle}
            </h2>
            <p className='mt-0.5 text-[13px] text-[#667085]'>
              {CONSENT_COPY.ko.reconsentTitle}
            </p>
          </div>
          <ConsentLocaleToggle />
        </div>

        <BilingualStack
          className='mt-4'
          en={status.policy.summaryEn || CONSENT_COPY.en.reconsentBody}
          ko={status.policy.summaryKo || CONSENT_COPY.ko.reconsentBody}
        />

        <p className='mt-3 text-[12px] text-[#98a2b3]'>
          Terms {status.policy.termsVersion} · Privacy {status.policy.privacyVersion}
        </p>

        <div className='mt-3 flex gap-3 text-[13px]'>
          <Link
            href={TERMS_HREF}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
          >
            {CONSENT_COPY.en.termsLink} / {CONSENT_COPY.ko.termsLink}
          </Link>
          <Link
            href={PRIVACY_HREF}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
          >
            {CONSENT_COPY.en.privacyLink} / {CONSENT_COPY.ko.privacyLink}
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
          className='mt-4 min-h-[48px] w-full rounded-full bg-[linear-gradient(135deg,#ff4c14_0%,#f64310_50%,#df390e_100%)] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(246,67,16,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50'
        >
          {saving
            ? copy.saving
            : `${CONSENT_COPY.en.reconsentConfirm} / ${CONSENT_COPY.ko.reconsentConfirm}`}
        </button>
      </div>
    </div>
  )
}
