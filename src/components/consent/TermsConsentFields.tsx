'use client'

import Link from 'next/link'
import { useId } from 'react'

import { CONSENT_COPY } from '@lib/consent/copy'
import {
  PRIVACY_HREF,
  TERMS_ARBITRATION_HREF,
  TERMS_HREF,
} from '@lib/consent/copy'

import { BilingualStack } from './BilingualStack'
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
  const aria = CONSENT_COPY[locale].agreeCheckboxAria
  const en = CONSENT_COPY.en
  const ko = CONSENT_COPY.ko

  return (
    <div className='space-y-3'>
      {showLocaleToggle ? (
        <div className='flex justify-end'>
          <ConsentLocaleToggle />
        </div>
      ) : null}

      <div
        className={`rounded-xl bg-[#fff8f5] px-3.5 py-3 ring-1 ${
          error ? 'ring-red-400' : 'ring-[var(--brand)]/15'
        }`}
      >
        <div className='flex gap-3'>
          <input
            id={checkboxId}
            type='checkbox'
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className='mt-1 size-4 shrink-0 accent-[#F64310]'
            aria-label={aria}
            aria-invalid={error}
            aria-describedby={`${checkboxId}-arbitration ${checkboxId}-notice${
              error ? ` ${checkboxId}-error` : ''
            }`}
          />
          <label htmlFor={checkboxId} className='min-w-0 flex-1 cursor-pointer'>
            <span className='block text-[13px] leading-relaxed text-[var(--foreground)]'>
              I have read and agree to the{' '}
              <Link
                href={TERMS_HREF}
                target='_blank'
                rel='noopener noreferrer'
                className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
              >
                {en.termsLink}
              </Link>{' '}
              and{' '}
              <Link
                href={PRIVACY_HREF}
                target='_blank'
                rel='noopener noreferrer'
                className='font-semibold text-[#F64310] underline-offset-2 hover:underline'
              >
                {en.privacyLink}
              </Link>
              .
            </span>
            <span className='mt-0.5 block text-[12px] leading-relaxed text-[#667085]'>
              <Link
                href={TERMS_HREF}
                target='_blank'
                rel='noopener noreferrer'
                className='font-medium text-[#F64310] underline-offset-2 hover:underline'
              >
                {ko.termsLink}
              </Link>
              {' 및 '}
              <Link
                href={PRIVACY_HREF}
                target='_blank'
                rel='noopener noreferrer'
                className='font-medium text-[#F64310] underline-offset-2 hover:underline'
              >
                {ko.privacyLink}
              </Link>
              을 읽었으며 이에 동의합니다.
            </span>
          </label>
        </div>

        <div
          id={`${checkboxId}-arbitration`}
          className='mt-3 border-t border-[var(--brand)]/10 pt-2.5'
        >
          <BilingualStack
            en={en.arbitrationNotice}
            ko={ko.arbitrationNotice}
            enClassName='text-[12px] text-[#475467]'
            koClassName='text-[11px] text-[#667085]'
          />
          <p className='mt-1 text-[11px] text-[#98a2b3]'>
            <Link
              href={TERMS_ARBITRATION_HREF}
              target='_blank'
              rel='noopener noreferrer'
              className='underline-offset-2 hover:underline'
            >
              Section 22 / 22조
            </Link>
          </p>
        </div>
      </div>

      {error ? (
        <p
          id={`${checkboxId}-error`}
          role='alert'
          className='text-[12px] font-medium text-red-600'
        >
          <span className='block'>{en.agreeError}</span>
          <span className='block text-[11px] font-normal text-red-500'>
            {ko.agreeError}
          </span>
        </p>
      ) : null}

      <p
        id={`${checkboxId}-notice`}
        className='text-[10px] leading-relaxed text-[#98a2b3]'
      >
        <span className='block'>{en.languageNotice}</span>
        <span className='mt-0.5 block'>{ko.languageNotice}</span>
      </p>
    </div>
  )
}
