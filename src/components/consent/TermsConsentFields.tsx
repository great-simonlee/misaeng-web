'use client'

import Link from 'next/link'
import { useId } from 'react'

import { CONSENT_COPY } from '@lib/consent/copy'
import {
  PRIVACY_HREF,
  TERMS_HREF,
} from '@lib/consent/copy'

import {
  ConsentLocaleToggle,
  useConsentLocale,
} from './ConsentLocaleProvider'

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
  const checkboxId = id || generatedId
  const { locale } = useConsentLocale()
  const copy = CONSENT_COPY[locale]

  return (
    <div className='space-y-3'>
      {showLocaleToggle ? (
        <div className='flex justify-end'>
          <ConsentLocaleToggle />
        </div>
      ) : null}

      <div
        className={`rounded-xl bg-[#f4f6f9] px-3.5 py-3 ring-1 ${
          error ? 'ring-red-400' : 'ring-black/[0.06]'
        }`}
      >
        <div className='flex gap-3'>
          <input
            id={checkboxId}
            type='checkbox'
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className='mt-1 size-4 shrink-0 accent-[#F64310]'
            aria-label={copy.agreeCheckboxAria}
            aria-invalid={error}
            aria-describedby={`${checkboxId}-arbitration ${checkboxId}-notice${
              error ? ` ${checkboxId}-error` : ''
            }`}
          />
          <label htmlFor={checkboxId} className='min-w-0 flex-1 cursor-pointer'>
            <span className='block text-[13px] leading-relaxed text-[var(--foreground)]'>
              {locale === 'en' ? (
                <>
                  I have read and agree to the{' '}
                  <Link
                    href={TERMS_HREF}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
                  >
                    {copy.termsLink}
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={PRIVACY_HREF}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
                  >
                    {copy.privacyLink}
                  </Link>
                  .
                </>
              ) : (
                <>
                  <Link
                    href={TERMS_HREF}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
                  >
                    {copy.termsLink}
                  </Link>
                  {' 및 '}
                  <Link
                    href={PRIVACY_HREF}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
                  >
                    {copy.privacyLink}
                  </Link>
                  을 읽었으며 이에 동의합니다.
                </>
              )}
            </span>
          </label>
        </div>

        <div
          id={`${checkboxId}-arbitration`}
          className='mt-3 border-t border-black/[0.06] pt-2.5'
        >
          <p className='text-[12px] leading-relaxed text-[#667085]'>
            {copy.arbitrationNotice}{' '}
            <Link
              href={TERMS_HREF}
              target='_blank'
              rel='noopener noreferrer'
              className='font-medium text-[#475467] underline-offset-2 hover:underline'
            >
              {copy.termsLink}
            </Link>
            {locale === 'en' ? '.' : '에서 확인하세요.'}
          </p>
        </div>
      </div>

      {error ? (
        <p
          id={`${checkboxId}-error`}
          role='alert'
          className='text-[12px] font-medium text-red-600'
        >
          {copy.agreeError}
        </p>
      ) : null}

      <p
        id={`${checkboxId}-notice`}
        className='text-[10px] leading-relaxed text-[#98a2b3]'
      >
        {copy.languageNotice}
      </p>
    </div>
  )
}
