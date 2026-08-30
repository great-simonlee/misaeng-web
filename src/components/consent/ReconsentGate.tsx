'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import type { ConsentStatus } from '@lib/consent/types'

import { useConsentLocale } from './ConsentLocaleProvider'
import { ReconsentModal } from './ReconsentModal'

const PASSTHROUGH = [
  '/nyc/login',
  '/nyc/terms-of-use',
  '/nyc/privacy-policy',
  '/terms',
  '/privacy',
]

function isPassthroughPath(pathname: string) {
  return (
    PASSTHROUGH.includes(pathname) ||
    pathname.startsWith('/nyc/terms-of-use') ||
    pathname.startsWith('/nyc/privacy-policy')
  )
}

export function ReconsentGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading, sessionLoading } = useAuth()
  const { locale } = useConsentLocale()
  const [status, setStatus] = useState<ConsentStatus | null>(null)
  const skip = isPassthroughPath(pathname)
  const blocking = Boolean(user && !skip && status?.required)

  useEffect(() => {
    if (loading || sessionLoading || !user || skip) return

    let cancelled = false

    void fetch('/api/legal/consent/status', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as ConsentStatus
      })
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })

    return () => {
      cancelled = true
    }
  }, [loading, sessionLoading, skip, user])

  // 재동의 전에는 약관/개인정보(새 탭 링크) 외 인앱 이동을 막음
  useEffect(() => {
    if (!blocking) return

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!anchor) return
      if (anchor.getAttribute('target') === '_blank') return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('#')) return
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        if (isPassthroughPath(url.pathname)) return
      } catch {
        return
      }
      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [blocking])

  const handleAgreed = useCallback(async () => {
    if (!status) return
    const res = await fetch('/api/legal/consent', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acceptedTerms: true,
        termsVersion: status.policy.termsVersion,
        privacyVersion: status.policy.privacyVersion,
        uiLanguage: locale,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null
      throw new Error(data?.error || 'Consent failed')
    }
    setStatus((prev) =>
      prev ? { ...prev, required: false, reason: 'none' } : prev,
    )
  }, [locale, status])

  return (
    <>
      <div
        inert={blocking ? true : undefined}
        className={blocking ? 'pointer-events-none select-none' : undefined}
        aria-hidden={blocking || undefined}
      >
        {children}
      </div>
      {blocking && status ? (
        <ReconsentModal status={status} onAgreed={handleAgreed} />
      ) : null}
    </>
  )
}
