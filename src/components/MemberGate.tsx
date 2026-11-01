'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, type ReactNode } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCityPath } from '@hooks/useCity'

import { LoadingState } from './LoadingSpinner'

/**
 * 회원 전용 화면 (비자·직장 후기·회사·채용 공고). 링크로 들어온 비회원은 로그인 화면으로 보내고,
 * 로그인하면 `?next=`로 원래 페이지에 돌아온다. 서버 HTML에는 본문이 들어가지 않는다 (세션은 브라우저에서만 확인).
 * 2027년 포인트·결제로 열람하는 조건이 생기면 이 관문 한 곳에 추가한다.
 */
export function MemberGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <Gate>{children}</Gate>
    </Suspense>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { user, loading, sessionLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const href = useCityPath()
  const checking = loading || sessionLoading

  useEffect(() => {
    if (checking || user) return
    const query = searchParams.toString()
    const next = query ? `${pathname}?${query}` : pathname
    router.replace(`${href('/login')}?next=${encodeURIComponent(next)}`)
  }, [checking, user, pathname, searchParams, href, router])

  if (checking || !user) return <LoadingState fullPage />
  return <>{children}</>
}
