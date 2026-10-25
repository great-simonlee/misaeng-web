'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { BRAND_CONFIG } from '@lib/brand'

import { formatDate, formatNumber, formatRelativeTime, formatUsd } from './format'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from './locales'
import { localePath, switchLocalePath } from './paths'
import { createTranslator, type MessageTree, type Translate } from './translate'

type LocaleContextValue = {
  locale: Locale
  t: Translate
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/** 서비스 루트 layout이 현재 언어와 (빠진 문구를 채운) 문구 트리를 내려 준다. */
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: MessageTree
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(messages, locale) }),
    [locale, messages],
  )
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

const FALLBACK: LocaleContextValue = {
  locale: BRAND_CONFIG.serviceDefaultLocale,
  t: (key) => key,
}

/** 회사 페이지처럼 LocaleProvider 밖이면 브랜드 기본 언어 */
export function useLocale(): Locale {
  return (useContext(LocaleContext) ?? FALLBACK).locale
}

/**
 * `const t = useT('community')` → `t('comments.empty')`
 * 네임스페이스 없이 부르면 전체 키를 쓴다 (`t('common.save')`).
 */
export function useT(namespace?: string): Translate {
  const { t } = useContext(LocaleContext) ?? FALLBACK
  return useMemo<Translate>(
    () => (namespace ? (key, params) => t(`${namespace}.${key}`, params) : t),
    [t, namespace],
  )
}

/** 현재 언어 접두사를 붙인 경로 (`/nyc/food` → `/vi/nyc/food`) */
export function useLocalePath(): (path: string) => string {
  const locale = useLocale()
  return useCallback((path: string) => localePath(locale, path), [locale])
}

/** 언어 메뉴·마이페이지에서 고른 언어를 기억한다 (proxy가 다음 방문 때 이 언어로 보낸다). */
export function rememberLocale(locale: Locale) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`
  } catch {
    // 쿠키를 못 쓰면 이번 방문에서만 바뀐다
  }
}

/** 현재 언어로 날짜·숫자를 표시하는 함수 묶음 */
export function useFormat() {
  const locale = useLocale()
  return useMemo(
    () => ({
      date: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(locale, value, options),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(locale, value, options),
      usd: (value: number, maximumFractionDigits?: number) =>
        formatUsd(locale, value, maximumFractionDigits),
      relative: (value: number | Date) => formatRelativeTime(locale, value),
    }),
    [locale],
  )
}

/**
 * 고른 언어로 바로 바꾼다: 쿠키에 기억하고 같은 페이지를 그 언어 주소로 연다.
 * (로그인 사용자의 프로필 저장은 부르는 쪽에서)
 */
export function useSwitchLocale() {
  const locale = useLocale()
  return useCallback(
    (next: Locale, pathname: string) => {
      rememberLocale(next)
      if (next === locale) return null
      return `${switchLocalePath(pathname, next)}${typeof window === 'undefined' ? '' : window.location.search}`
    },
    [locale],
  )
}
