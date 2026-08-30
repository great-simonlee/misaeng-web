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

export function ReconsentGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading, sessionLoading } = useAuth()
  const { locale } = useConsentLocale()
  const [status, setStatus] = useState<ConsentStatus | null>(null)
  const skip =
    PASSTHROUGH.includes(pathname) ||
    pathname.startsWith('/nyc/terms-of-use') ||
    pathname.startsWith('/nyc/privacy-policy')

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

  const showModal = Boolean(user && !skip && status?.required)

  return (
    <>
      {children}
      {showModal && status ? (
        <ReconsentModal status={status} onAgreed={handleAgreed} />
      ) : null}
    </>
  )
}
