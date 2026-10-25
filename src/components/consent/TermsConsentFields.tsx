'use client'

import Link from 'next/link'
import { useId, useState, type ReactNode } from 'react'

import { useCityPath } from '@hooks/useCity'
import { PRIVACY_PATH, TERMS_PATH } from '@lib/consent/copy'
import { useT } from '@lib/i18n/client'
import { rich } from '@lib/i18n/rich'

import { ConsentLocaleToggle } from './ConsentLocaleProvider'

type TermsConsentFieldsProps = {
  checked: boolean
  onChange: (next: boolean) => void
  error?: boolean
  id?: string
  showLocaleToggle?: boolean
}

export function TermsConsentFields({
  checked,
  onChange,
  error = false,
  id,
  showLocaleToggle = true,
}: TermsConsentFieldsProps) {
  const generatedId = useId()
  const baseId = id || generatedId
  const termsId = `${baseId}-terms`
  const privacyId = `${baseId}-privacy`
  const t = useT('consent')
  const href = useCityPath()
  const termsHref = href(TERMS_PATH)
  const privacyHref = href(PRIVACY_PATH)
  const [acceptedTerms, setAcceptedTerms] = useState(checked)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(checked)
  const [prevChecked, setPrevChecked] = useState(checked)

  if (checked !== prevChecked) {
    setPrevChecked(checked)
    if (!checked) {
      setAcceptedTerms(false)
      setAcceptedPrivacy(false)
    }
  }

  function updateTerms(next: boolean) {
    setAcceptedTerms(next)
    onChange(next && acceptedPrivacy)
  }

  function updatePrivacy(next: boolean) {
    setAcceptedPrivacy(next)
    onChange(acceptedTerms && next)
  }

  return (
    <div className='space-y-3'>
      {showLocaleToggle ? (
        <div className='flex justify-end'>
          <ConsentLocaleToggle />
        </div>
      ) : null}

      <div
        className={`space-y-3 rounded-xl bg-[#f4f6f9] px-3.5 py-3 ring-1 ${
          error ? 'ring-red-400' : 'ring-black/[0.06]'
        }`}
      >
        <ConsentCheckbox
          id={termsId}
          checked={acceptedTerms}
          onChange={updateTerms}
          error={error}
          ariaLabel={t('agreeTermsAria')}
          describedBy={`${baseId}-arbitration ${baseId}-notice${
            error ? ` ${baseId}-error` : ''
          }`}
        >
          {rich(t('agreeTerms'), {
            terms: <PolicyLink href={termsHref}>{t('termsLink')}</PolicyLink>,
          })}
        </ConsentCheckbox>

        <ConsentCheckbox
          id={privacyId}
          checked={acceptedPrivacy}
          onChange={updatePrivacy}
          error={error}
          ariaLabel={t('agreePrivacyAria')}
          describedBy={`${baseId}-arbitration ${baseId}-notice${
            error ? ` ${baseId}-error` : ''
          }`}
        >
          {rich(t('agreePrivacy'), {
            privacy: <PolicyLink href={privacyHref}>{t('privacyLink')}</PolicyLink>,
          })}
        </ConsentCheckbox>

        <div
          id={`${baseId}-arbitration`}
          className='border-t border-black/[0.06] pt-2.5'
        >
          <p className='text-[12px] leading-relaxed text-[#667085]'>
            {rich(t('arbitrationNotice'), {
              terms: (
                <Link
                  href={termsHref}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-medium text-[#475467] underline-offset-2 hover:underline'
            >
                  {t('termsLink')}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>

      {error ? (
        <p
          id={`${baseId}-error`}
          role='alert'
          className='text-[12px] font-medium text-red-600'
        >
          {t('agreeError')}
        </p>
      ) : null}

      <p
        id={`${baseId}-notice`}
        className='text-[10px] leading-relaxed text-[#98a2b3]'
      >
        {t('languageNotice')}
      </p>
    </div>
  )
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  error,
  ariaLabel,
  describedBy,
  children,
}: {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
  error: boolean
  ariaLabel: string
  describedBy: string
  children: ReactNode
}) {
  return (
    <div className='flex gap-3'>
      <input
        id={id}
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className='mt-1 size-4 shrink-0 accent-brand'
        aria-label={ariaLabel}
        aria-invalid={error}
        aria-describedby={describedBy}
      />
      <label htmlFor={id} className='min-w-0 flex-1 cursor-pointer'>
        <span className='block text-[13px] leading-relaxed text-[var(--foreground)]'>
          {children}
        </span>
      </label>
    </div>
  )
}

function PolicyLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='font-semibold text-brand underline-offset-2 hover:underline'
    >
      {children}
    </Link>
  )
}
