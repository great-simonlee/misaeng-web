'use client'

import { CONSENT_COPY } from '@lib/consent/copy'
import type { ConsentUiLanguage } from '@lib/consent/types'

import { useConsentLocale } from './ConsentLocaleProvider'

type BilingualLocaleTextProps = {
  en: string
  ko: string
  as?: 'p' | 'span' | 'div'
  className?: string
}

/** (b) Shows one language from navigator.language / EN-KO toggle. */
export function BilingualLocaleText({
  en,
  ko,
  as: Tag = 'span',
  className,
}: BilingualLocaleTextProps) {
  const { locale } = useConsentLocale()
  return <Tag className={className}>{locale === 'ko' ? ko : en}</Tag>
}

export function copyForLocale(locale: ConsentUiLanguage) {
  return CONSENT_COPY[locale]
}
