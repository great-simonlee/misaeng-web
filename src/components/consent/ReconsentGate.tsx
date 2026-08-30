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

  const loadStatus = useCallback(async () => {
    if (!user || skip) {
      setStatus(null)
      return
    }
    const res = await fetch('/api/legal/consent/status', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) {
      setStatus(null)
      return
    }
    const data = (await res.json()) as ConsentStatus
    setStatus(data)
  }, [skip, user])

  useEffect(() => {
    if (loading || sessionLoading) return
    void loadStatus()
  }, [loadStatus, loading, sessionLoading])

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
    setStatus((prev) => (prev ? { ...prev, required: false, reason: 'none' } : prev))
  }, [locale, status])

  return (
    <>
      {children}
      {user && !skip && status?.required ? (
        <ReconsentModal status={status} onAgreed={handleAgreed} />
      ) : null}
    </>
  )
}
