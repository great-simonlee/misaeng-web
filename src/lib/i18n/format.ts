import { BRAND_CONFIG } from '@lib/brand'

import type { Locale } from './locales'

/**
 * 언어별 날짜·숫자 표시. 화면에서 'ko-KR'처럼 언어를 직접 적지 말고 이 함수에 현재 locale을 넘긴다.
 * (클라이언트는 `useFormat()`이 현재 언어를 채워 준다)
 */

export function formatDate(
  locale: Locale,
  value: number | string | Date,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  // 브랜드별 날짜 순서 (Ellieo: 일/월/년). 가격·숫자 표기는 그대로 둔다.
  return new Intl.DateTimeFormat(BRAND_CONFIG.dateLocales[locale] ?? locale, options).format(date)
}

export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/** 달러 금액. 서비스가 뉴욕 기준이라 통화는 USD 고정, 표기만 언어를 따른다. */
export function formatUsd(locale: Locale, value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value)
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** `3분 전` / `3 minutes ago`. 1분 미만은 `now`(지금·방금) */
export function formatRelativeTime(
  locale: Locale,
  value: number | Date,
  now: number = Date.now(),
): string {
  const time = value instanceof Date ? value.getTime() : value
  const diffSeconds = Math.round((time - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.trunc(diffSeconds / seconds), unit)
    }
  }
  return rtf.format(0, 'second')
}
