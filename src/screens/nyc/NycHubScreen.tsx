'use client'

import { useEffect } from 'react'

import { AppHandoffButton } from '@components/AppHandoff'
import { useCityInfo, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { captureReferralFromLocation } from '@lib/community/referral'
import { useT } from '@lib/i18n/client'
import { AppDownloadPrompt } from '@widgets/nyc/AppDownloadPrompt'
import Link from 'next/link'
import { HeroAppCard } from '@widgets/nyc/HeroAppCard'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { MagazinePreviewSection } from '@widgets/nyc/MagazinePreviewSection'
import { PartnerSchoolsMarquee } from '@widgets/nyc/PartnerSchoolsMarquee'
import { PartnerInfluencersSection } from '@widgets/nyc/PartnerInfluencersSection'
import { ProfessionalsSection } from '@widgets/nyc/ProfessionalsSection'

export function NycHubScreen() {
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('hub')
  const tCommon = useT('common')

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[var(--canvas)]'>
      {/* phones: point to the app (Misaeng only, hidden for a few days once dismissed) */}
      <AppDownloadPrompt />

      {/* Hero: one strong line, what it is, two ways in */}
      <section className='relative overflow-hidden bg-white'>
        <div
          className='pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full opacity-70 blur-3xl'
          style={{
            background: 'radial-gradient(circle, rgb(var(--brand-rgb) / 0.16), transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className='pointer-events-none absolute -bottom-48 -left-32 size-[28rem] rounded-full opacity-60 blur-3xl'
          style={{ background: 'radial-gradient(circle, rgb(59 130 246 / 0.10), transparent 65%)' }}
          aria-hidden
        />
        <div className='relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8'>
          <div className='min-w-0'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--card-ring)]'>
              <span className='size-1.5 rounded-full bg-[var(--brand)]' aria-hidden />
              {t('brandCity', { brand: BRAND_CONFIG.name, city: cityInfo.shortLabel })}
            </span>
            <h1 className='mt-5 max-w-3xl text-[2.15rem] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl lg:text-[3.5rem]'>
              {t(`cities.${cityInfo.id}.headline`)}
            </h1>
            <p className='mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--muted-foreground)] sm:text-lg'>
              {t(`cities.${cityInfo.id}.description`)}
            </p>
            <div className='mt-8 flex flex-wrap items-center gap-2.5'>
              {/* The boards are in the header; the hero points to the one most people come for */}
              <Link
                href={href('/housing')}
                className='inline-flex h-12 items-center gap-2 rounded-full bg-[var(--foreground)] px-6 text-[15px] font-semibold text-white transition hover:bg-black'
              >
                {t('heroCta')}
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  className='size-4'
                  aria-hidden
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M5 12h14M13 6l6 6-6 6' />
                </svg>
              </Link>
              <AppHandoffButton
                appPath='home'
                action='open'
                variant='plain'
                className='inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-[var(--foreground)] ring-1 ring-black/10 transition hover:bg-[#fafbfc]'
                label={tCommon('appHandoff.buttons.getApp')}
              />
            </div>
          </div>
          <div className='hidden lg:block'>
            <HeroAppCard />
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className='mx-auto max-w-7xl px-5 pt-8 sm:px-6 sm:pt-10 lg:px-8'>
        <PartnerSchoolsMarquee />
        <PartnerInfluencersSection />
      </section>

      <main className='mx-auto max-w-7xl space-y-10 px-5 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8'>
        {/* 매거진·전문가 예시는 뉴욕 내용이라 뉴욕에서만 보여 준다 */}
        {cityInfo.id === 'nyc' ? (
          <>
            <MagazinePreviewSection />
            <ProfessionalsSection />
          </>
        ) : null}
      </main>
    </div>
  )
}
