'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { useAuth } from '@hooks/useAuth'
import { resolveServiceLocale } from '@lib/brand'
import { rememberLocale, useLocale } from '@lib/i18n/client'
import { LOCALE_COOKIE } from '@lib/i18n/locales'
import { switchLocalePath } from '@lib/i18n/paths'

/**
 * 로그인하면 프로필 선호 언어로 맞춘다 (다른 기기·다른 브랜드에서 고른 언어 포함).
 * 이미 이 브라우저에서 언어를 골랐다면(쿠키) 그 선택을 존중하고 건드리지 않는다.
 */
export function PreferredLocaleSync() {
  const { profile } = useAuth()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !profile?.preferredLocale) return
    done.current = true
    const hasChoice = document.cookie
      .split(';')
      .some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`))
    if (hasChoice) return

    rememberLocale(profile.preferredLocale)
    const target = resolveServiceLocale(profile.preferredLocale)
    if (target !== locale) {
      router.replace(`${switchLocalePath(pathname, target)}${window.location.search}`)
    }
  }, [profile?.preferredLocale, locale, pathname, router])

  return null
}
