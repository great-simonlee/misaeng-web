'use client'

import Link from 'next/link'
import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { pretendard } from '@lib/fonts/pretendard'
import { NycIntroCarousel } from '@widgets/nyc/NycIntroCarousel'

export function NycCarouselTestScreen() {
  const href = useCityPath()
  const t = useT('hub')
  return (
    <div
      className={cn(
        pretendard.className,
        'min-h-[calc(100dvh-3.5rem)] bg-[#e9e4d9] py-10 sm:min-h-[calc(100dvh-4rem)] sm:py-14',
      )}
    >
      <div className='mx-auto max-w-[1400px]'>
        <div className='px-6 sm:px-10 lg:px-14'>
          <p className='text-[12px] font-medium tracking-[0.02em] text-[#8a8272]'>
            {t('carouselTest.kicker', { brand: BRAND_CONFIG.name })}
          </p>
          <h1 className='mt-1.5 text-[1.25rem] font-bold tracking-[-0.02em] text-[#101b30] sm:text-[1.375rem]'>
            {t('carouselTest.title')}
          </h1>
          <p className='mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-[#8a8272]'>
            {t('carouselTest.description')}
          </p>
        </div>

        <div className='mt-6'>
          <NycIntroCarousel />
        </div>

        <p className='mt-3 px-6 text-center text-[12px] text-[#8a8272] sm:px-10 lg:px-14'>
          {t('carouselTest.photoNote')}
        </p>

        <div className='mt-8 text-center'>
          <Link
            href={href()}
            className='text-[13px] font-medium text-[#8a8272] touch-manipulation transition hover:text-[#101b30]'
          >
            {t('carouselTest.backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
