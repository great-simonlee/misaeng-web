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
import { NycHubScreenClassic } from '@screens/nyc/NycHubScreenClassic'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { MagazinePreviewSection } from '@widgets/nyc/MagazinePreviewSection'
import { PartnerSchoolsMarquee } from '@widgets/nyc/PartnerSchoolsMarquee'
import { PartnerInfluencersSection } from '@widgets/nyc/PartnerInfluencersSection'
import { ProfessionalsSection } from '@widgets/nyc/ProfessionalsSection'

/** The boards on the hub, in the app's home order (중고거래 is app-only for now). */
const HUB_BOARDS = [
  { path: '/housing', label: 'housing' },
  { path: '/job-review', label: 'jobReview' },
  { path: '/status', label: 'status' },
  { path: '/food', label: 'food' },
  { path: '/roommate', label: 'roommate' },
  { path: '/anonymous', label: 'anonymous' },
] as const

export function NycHubScreen() {
  // Ellieo keeps its own design; this redesign is Misaeng only
  if (BRAND_CONFIG.id !== 'misaeng') return <NycHubScreenClassic />
  return <MisaengHubScreen />
}

function MisaengHubScreen() {
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('hub')
  const tCommon = useT('common')
  const tNav = useT('nav')

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[var(--canvas)]'>
      {/* phones: point to the app (Misaeng only, hidden for a few days once dismissed) */}
      <AppDownloadPrompt />

      {/* Hero: one strong line, what it is, the boards (like the app's home). White fading into the page colour so
          it runs on into the partner rows below without a hard edge. */}
      <section className='relative overflow-hidden bg-gradient-to-b from-white via-white to-[var(--canvas)]'>
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
        <div className='relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8'>
          <div className='min-w-0'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--card-ring)]'>
              <span className='size-1.5 rounded-full bg-[var(--brand)]' aria-hidden />
              {t('brandCity', { brand: BRAND_CONFIG.name, city: cityInfo.shortLabel })}
            </span>
            {/* break-keep: Korean wraps between words, never inside one ("이야 / 기") */}
            <h1 className='mt-4 max-w-3xl break-keep text-balance text-[2rem] font-bold leading-[1.15] tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.6rem] lg:text-[3rem]'>
              {t(`cities.${cityInfo.id}.headline`)}
            </h1>
            <p className='mt-3 max-w-xl break-keep text-pretty text-[15px] leading-relaxed text-[var(--muted-foreground)] sm:text-[17px]'>
              {t(`cities.${cityInfo.id}.description`)}
            </p>
            {/* Every board as a chip, in the app's order */}
            <nav aria-label={tNav('menuAria', { city: cityInfo.shortLabel })} className='mt-6 flex flex-wrap gap-2'>
              {HUB_BOARDS.map((board) => (
                <Link
                  key={board.path}
                  href={href(board.path)}
                  className='inline-flex h-11 items-center rounded-full bg-white px-4 text-[15px] font-medium text-[var(--foreground)] ring-1 ring-[var(--card-ring)] transition hover:bg-[#fafbfc] hover:ring-black/15 active:scale-[0.98]'
                >
                  {tNav(`links.${board.label}`)}
                </Link>
              ))}
            </nav>
            <AppHandoffButton
              appPath='home'
              action='open'
              variant='plain'
              className='mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-5 text-[15px] font-semibold text-white transition hover:bg-black'
              label={tCommon('appHandoff.buttons.getApp')}
            />
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
