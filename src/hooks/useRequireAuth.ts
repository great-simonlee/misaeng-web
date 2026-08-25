'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@hooks/useAuth'

/** 로그인하지 않으면 로그인 페이지로 이동시킵니다. */
export function useRequireAuth(nextPath: string) {
  const auth = useAuth()
  const { user, loading } = auth
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/nyc/login?next=${encodeURIComponent(nextPath)}`)
    }
  }, [user, loading, nextPath, router])

  return {
    ...auth,
    isAuthenticated: Boolean(user),
  }
}
