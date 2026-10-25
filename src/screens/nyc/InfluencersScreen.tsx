'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { useT } from '@lib/i18n/client'
import { MisaengNyInstagramDmCallout } from '@widgets/nyc/MisaengNyInstagramDmCallout'

export function InfluencersScreen() {
  const href = useCityPath()
  const t = useT('partners')
  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_42%,#ffffff_100%)]'>
      <div className='mx-auto max-w-lg px-5 pb-12 pt-8 sm:px-6 sm:pt-10'>
        <p className='text-[12px] font-medium text-[var(--muted)]'>
          {t('influencersLabel')}
        </p>
        <h1 className='mt-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          {t('influencers.title')}
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('influencers.intro')}
        </p>

        <div className='mt-8 rounded-[1.25rem] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
          <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
            {t('influencers.recruitingTitle')}
          </p>
          <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('influencers.recruitingBody')}
          </p>
        </div>

        <MisaengNyInstagramDmCallout message={t('influencers.dmMessage')} />

        <div className='mt-8 text-center'>
          <Link
            href={href()}
            className='text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
