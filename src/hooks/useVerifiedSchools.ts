'use client'

import { useEffect, useSyncExternalStore } from 'react'

import {
  BUILTIN_VERIFIED_SCHOOLS,
  getVerifiedSchools,
  setVerifiedSchools,
  subscribeVerifiedSchools,
  type VerifiedSchool,
} from '@lib/constants/schools'

let loadPromise: Promise<void> | null = null

/**
 * ERP에서 관리하는 학교 목록(/api/schools)을 페이지당 한 번 불러와 constants/schools에 넣는다.
 * 그 전까지(또는 실패하면) 기본 목록을 쓴다. 실패하면 다음 화면에서 다시 시도한다.
 */
export function loadVerifiedSchools(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = fetch('/api/schools')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { schools?: VerifiedSchool[] }
      const schools = (data.schools ?? []).filter(
        (school) => school && typeof school.id === 'string' && school.shortName && school.fullName,
      )
      if (schools.length > 0) {
        setVerifiedSchools(
          schools.map((school) => ({
            id: school.id,
            shortName: school.shortName,
            fullName: school.fullName,
            domains: Array.isArray(school.domains) ? school.domains : [],
            enabled: school.enabled !== false,
          })),
        )
      }
    })
    .catch(() => {
      loadPromise = null
    })
  return loadPromise
}

function getBuiltinSchools() {
  return BUILTIN_VERIFIED_SCHOOLS
}

/** 학교 id → 학교 (ERP 목록을 받으면 다시 그린다) */
export function useVerifiedSchool(id: string | null | undefined): VerifiedSchool | null {
  const schools = useVerifiedSchools()
  if (!id) return null
  return schools.find((school) => school.id === id) ?? BUILTIN_VERIFIED_SCHOOLS.find((school) => school.id === id) ?? null
}

/** 학교 목록 (사용 중지 포함). ERP 목록을 받으면 다시 그린다. */
export function useVerifiedSchools(): VerifiedSchool[] {
  // SSR·하이드레이션은 기본 목록으로 그리고, 받은 뒤 다시 그린다 (서버/브라우저 목록이 달라 생기는 불일치 방지)
  const schools = useSyncExternalStore(subscribeVerifiedSchools, getVerifiedSchools, getBuiltinSchools)
  useEffect(() => {
    void loadVerifiedSchools()
  }, [])
  return schools
}

/** 지금 인증받는 학교만 (필터 칩 등) */
export function useEnabledSchools(): VerifiedSchool[] {
  return useVerifiedSchools().filter((school) => school.enabled !== false)
}
