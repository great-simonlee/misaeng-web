'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { useT } from '@lib/i18n/client'

/** 면접·취업 게시판 소개 문구 아래 가로 배너 → 회사별 채용 페이지 */
export function CompanyDirectoryBanner() {
  const href = useCityPath()
  const t = useT('companies')
  return (
    <Link
      href={href('/companies')}
      data-ui='callout'
      className='group flex w-full items-center gap-3 rounded-2xl bg-[#fff5f1] px-4 py-3 ring-1 ring-[var(--brand)]/15 touch-manipulation transition hover:bg-[#ffede5] hover:ring-[var(--brand)]/30 active:scale-[0.995] sm:gap-4 sm:px-5 sm:py-3.5'
    >
      <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand)] shadow-sm ring-1 ring-black/[0.04] sm:size-10'>
        <BuildingIcon className='size-[18px] sm:size-5' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block text-[14px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[15px]'>
          {t('banner.title')}
        </span>
        <span data-ui='callout-body' className='mt-0.5 block truncate text-[12px] text-[var(--muted)] sm:text-[13px]'>
          {t('banner.description')}
        </span>
      </span>
      <span className='inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[var(--brand)]'>
        <span className='hidden sm:inline'>{t('banner.cta')}</span>
        <ArrowIcon className='size-4 transition group-hover:translate-x-0.5' />
      </span>
    </Link>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round' className={className} aria-hidden>
      <path d='M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16' />
      <path d='M16 9h2a2 2 0 0 1 2 2v10' />
      <path d='M3 21h18M8 7h4M8 11h4M8 15h4' />
    </svg>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className={className} aria-hidden>
      <path d='M5 12h14M13 6l6 6-6 6' />
    </svg>
  )
}
