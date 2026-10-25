'use client'

import { useConsentLocale } from './ConsentLocaleProvider'

type BilingualLocaleTextProps = {
  en: string
  ko: string
  as?: 'p' | 'span' | 'div'
  className?: string
}

/** (b) 페이지 언어가 한국어면 ko, 아니면 en */
export function BilingualLocaleText({
  en,
  ko,
  as: Tag = 'span',
  className,
}: BilingualLocaleTextProps) {
  const { locale } = useConsentLocale()
  return <Tag className={className}>{locale === 'ko' ? ko : en}</Tag>
}
