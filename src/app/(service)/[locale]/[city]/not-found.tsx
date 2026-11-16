'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'

/** City pages that call notFound(). Ellieo: friendly page inside the site shell. Misaeng: plain 404 line as before. */
export default function CityNotFound() {
  const t = useT('common')
  const href = useCityPath()
  if (BRAND_CONFIG.theme !== 'ellieo') {
    return (
      <div className='flex flex-1 items-center justify-center py-24 text-center text-[14px] text-[var(--muted)]'>
        404 · This page could not be found.
      </div>
    )
  }
  return (
    <div className='mx-auto flex w-full max-w-[40rem] flex-1 flex-col items-center px-4 py-16 text-center'>
      <div className='flex w-full flex-col items-center rounded-[1.75rem] bg-[var(--surface)] px-6 py-12'>
        <span aria-hidden className='text-[56px] leading-none'>🧭</span>
        <h1 className='mt-4 text-[24px] font-extrabold tracking-[-0.03em] text-[var(--foreground)]'>{t('ellieoNotFound.title')}</h1>
        <p className='mt-2 max-w-[22rem] text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{t('ellieoNotFound.body')}</p>
        <Link
          href={href()}
          className='mt-6 inline-flex h-12 items-center rounded-full bg-[var(--brand)] px-6 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
        >
          {t('ellieoNotFound.home')}
        </Link>
      </div>
    </div>
  )
}
