'use client'

import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { BoardHighlightCards } from '@widgets/nyc/BoardHighlightCards'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { MagazinePreviewSection } from '@widgets/nyc/MagazinePreviewSection'
import { PartnerSchoolsMarquee } from '@widgets/nyc/PartnerSchoolsMarquee'
import { PartnerInfluencersSection } from '@widgets/nyc/PartnerInfluencersSection'
import { ProfessionalsSection } from '@widgets/nyc/ProfessionalsSection'

/** 임시: 허브 진입 시 스피너 노출 시간 (ms) */
const TEMP_SPLASH_MS = 1200

export function NycHubScreen() {
  // const { configured } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), TEMP_SPLASH_MS)
    return () => window.clearTimeout(id)
  }, [])

  if (showSplash) {
    return <LoadingState fullPage label='로딩 중이에요…' />
  }

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[var(--background)]'>
      <header className='border-b border-[var(--border)]'>
        <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
              MISAENG NYC
            </p>
            <h1 className='mt-1.5 text-[1.375rem] font-bold tracking-tight text-[var(--foreground)] sm:text-2xl'>
              뉴욕에서 함께 살아가는 이야기
            </h1>
            <p className='mt-1.5 max-w-lg text-sm leading-relaxed text-[var(--muted-foreground)]'>
              유학생 · 직장인을 위한 New York City 정보 공유 공간이에요.
            </p>
          </div>

          <div className='mt-5'>
            <BoardHighlightCards />
          </div>

          <PartnerSchoolsMarquee />
          <PartnerInfluencersSection />

          {/* 임시: 파이어베이스 배너 비활성화
          {!configured && (
            <div className='mt-5'>
              <FirebaseConfigBanner />
            </div>
          )}
          */}
        </div>
      </header>

      <main className='mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8'>
        <MagazinePreviewSection />
        <ProfessionalsSection />
      </main>
    </div>
  )
}
