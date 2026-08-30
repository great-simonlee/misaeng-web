'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { detectConsentLocale } from '@lib/consent/copy'
import { CONSENT_COPY } from '@lib/consent/copy'
import type { ConsentUiLanguage } from '@lib/consent/types'

type ConsentLocaleContextValue = {
  locale: ConsentUiLanguage
  setLocale: (locale: ConsentUiLanguage) => void
  copy: (typeof CONSENT_COPY)[ConsentUiLanguage]
}

const ConsentLocaleContext = createContext<ConsentLocaleContextValue | null>(
  null,
)

function subscribeLanguage() {
  return () => {}
}

function getBrowserLocale(): ConsentUiLanguage {
  return detectConsentLocale(navigator.language)
}

function getServerLocale(): ConsentUiLanguage {
  return 'en'
}

export function ConsentLocaleProvider({ children }: { children: ReactNode }) {
  const detected = useSyncExternalStore(
    subscribeLanguage,
    getBrowserLocale,
    getServerLocale,
  )
  const [override, setOverride] = useState<ConsentUiLanguage | null>(null)
  const locale = override ?? detected

  const value = useMemo(
    () => ({
      locale,
      setLocale: setOverride,
      copy: CONSENT_COPY[locale],
    }),
    [locale],
  )

  return (
    <ConsentLocaleContext.Provider value={value}>
      {children}
    </ConsentLocaleContext.Provider>
  )
}

export function useConsentLocale() {
  const ctx = useContext(ConsentLocaleContext)
  if (!ctx) {
    throw new Error('useConsentLocale must be used inside ConsentLocaleProvider')
  }
  return ctx
}

export function useConsentLocaleOptional() {
  return useContext(ConsentLocaleContext)
}

export function ConsentLocaleToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, copy } = useConsentLocale()
  const switchTo = useCallback(
    (next: ConsentUiLanguage) => {
      setLocale(next)
    },
    [setLocale],
  )

  return (
    <div
      className={`inline-flex rounded-full bg-[#edf0f5] p-0.5 ${className}`}
      role='group'
      aria-label='Language / 언어'
    >
      <button
        type='button'
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
        className={`min-h-[28px] min-w-[36px] rounded-full px-2 text-[11px] font-semibold transition ${
          locale === 'en'
            ? 'bg-white text-[var(--foreground)] shadow-sm'
            : 'text-[#8b95a7] hover:text-[var(--foreground)]'
        }`}
      >
        {copy.localeEn}
      </button>
      <button
        type='button'
        onClick={() => switchTo('ko')}
        aria-pressed={locale === 'ko'}
        className={`min-h-[28px] min-w-[36px] rounded-full px-2 text-[11px] font-semibold transition ${
          locale === 'ko'
            ? 'bg-white text-[var(--foreground)] shadow-sm'
            : 'text-[#8b95a7] hover:text-[var(--foreground)]'
        }`}
      >
        {copy.localeKo}
      </button>
    </div>
  )
}
