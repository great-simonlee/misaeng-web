'use client'

import Link from 'next/link'

export function InfluencersScreen() {
  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_42%,#ffffff_100%)]'>
      <div className='mx-auto max-w-lg px-5 pb-12 pt-8 sm:px-6 sm:pt-10'>
        <p className='text-[12px] font-medium text-[var(--muted)]'>
          협력 인플루언서
        </p>
        <h1 className='mt-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
          인플루언서 콘텐츠
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          협력 인플루언서가 올린 콘텐츠를 한곳에서 모아 볼 예정이에요.
        </p>

        <div className='mt-8 rounded-[1.25rem] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
          <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
            곧 공개됩니다
          </p>
          <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            인스타그램 · 유튜브 · 틱톡 콘텐츠가 여기에 모여요.
          </p>
          <Link
            href='/nyc'
            className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
          >
            커뮤니티 홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
