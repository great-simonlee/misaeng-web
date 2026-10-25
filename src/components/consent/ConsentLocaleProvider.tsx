'use client'

import type { ReactNode } from 'react'

import { useLocale } from '@lib/i18n/client'
import type { ConsentUiLanguage } from '@lib/consent/types'
import { LanguageMenu } from '@widgets/LanguageMenu'

/**
 * 동의 화면 언어 = 지금 보고 있는 페이지 언어 (src/lib/i18n). 예전에는 EN/KO 토글을 따로 두었지만
 * 이제 헤더 언어 메뉴와 같은 언어를 쓴다. 기록에는 이 언어가 ui_language로 남는다 (법적 기준은 영문본).
 */
export function ConsentLocaleProvider({ children }: { children: ReactNode }) {
  return children
}

export function useConsentLocale(): { locale: ConsentUiLanguage } {
  return { locale: useLocale() }
}

export function useConsentLocaleOptional() {
  return useConsentLocale()
}

/** 동의 화면 안에서 언어를 바꾸는 메뉴 (헤더 언어 메뉴와 같다) */
export function ConsentLocaleToggle({ className = '' }: { className?: string }) {
  return <LanguageMenu className={className} />
}
