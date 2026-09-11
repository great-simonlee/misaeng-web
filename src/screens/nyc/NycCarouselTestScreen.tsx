'use client'

import Link from 'next/link'
import { Noto_Sans_KR } from 'next/font/google'

import { cn } from '@lib'
import { NycIntroCarousel } from '@widgets/nyc/NycIntroCarousel'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  display: 'swap',
})

export function NycCarouselTestScreen() {
  return (
    <div
      className={cn(
        notoSansKr.className,
        'min-h-[calc(100dvh-3.5rem)] bg-[#e9e4d9] py-10 sm:min-h-[calc(100dvh-4rem)] sm:py-14',
      )}
    >
      <div className='mx-auto max-w-[1400px]'>
        <div className='px-6 sm:px-10 lg:px-14'>
          <p className='text-[12px] font-medium tracking-[0.02em] text-[#8a8272]'>
            Misaeng NYC · 캐러셀 시안
          </p>
          <h1 className='mt-1.5 text-[1.25rem] font-bold tracking-[-0.02em] text-[#101b30] sm:text-[1.375rem]'>
            소개 캐러셀
          </h1>
          <p className='mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-[#8a8272]'>
            사진 전체 배경 · 1080×1080 기준 · 좌우 스크롤. 슬라이드마다 주제별
            분위기 오버레이를 다르게 적용했습니다.
          </p>
        </div>

        <div className='mt-6'>
          <NycIntroCarousel />
        </div>

        <p className='mt-3 px-6 text-center text-[12px] text-[#8a8272] sm:px-10 lg:px-14'>
          배경은 Unsplash 뉴욕·라이프스타일 실사이며, 발행 전 고해상도 브랜드
          사진으로 교체를 권장합니다.
        </p>

        <div className='mt-8 text-center'>
          <Link
            href='/nyc'
            className='text-[13px] font-medium text-[#8a8272] touch-manipulation transition hover:text-[#101b30]'
          >
            커뮤니티 홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
