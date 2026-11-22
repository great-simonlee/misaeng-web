'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { useFormat, useT } from '@lib/i18n/client'
import { fetchPremiumMe, type PremiumMe } from '@lib/premium/client'

/**
 * 마이페이지 "미생 Premium" card (Misaeng only): status for members (plan · until / renews / N days left on a code),
 * "7일 무료로 시작하기" otherwise, plus the "프로모션 코드가 있어요" link. Both open /premium (or /premium/redeem).
 */
export function MyPagePremiumCard({ className }: { className?: string }) {
  const t = useT('premium')
  const fmt = useFormat()
  const href = useCityPath()
  const [me, setMe] = useState<PremiumMe | null>(null)
  const [openedAt] = useState(() => Date.now())

  useEffect(() => {
    void fetchPremiumMe().then(setMe)
  }, [])

  if (BRAND_CONFIG.id !== 'misaeng') return null

  const date = me?.until ? fmt.date(me.until, { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const granted = me?.source === 'code' || me?.source === 'gift'
  const daysLeft = me?.until ? Math.max(0, Math.ceil((Date.parse(me.until) - openedAt) / 86_400_000)) : null
  const status = !me?.premium
    ? t('myCard.pitch')
    : me.source === 'staff'
      ? t('active.staff')
      : granted && date
        ? `${t('active.codeUntil', { date })}${daysLeft !== null ? ` · ${t('active.codeDaysLeft', { days: daysLeft })}` : ''}`
        : date
          ? me.cancelAtPeriodEnd
            ? t('active.ends', { date })
            : t('active.renews', { date })
          : t('active.title')

  return (
    <section className={cn('rounded-[1.25rem] bg-[linear-gradient(140deg,#FFE3D3,#FFF6EE)] p-4 ring-1 ring-[#F64310]/10 sm:p-5', className)}>
      <Link href={href('/premium')} className='group flex items-center gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[18px] shadow-sm' aria-hidden>
          ✦
        </span>
        <span className='min-w-0 flex-1'>
          <span className='flex items-center gap-2'>
            <span className='text-[15px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('myCard.title')}</span>
            {me?.premium ? (
              <span className='rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] font-bold text-white'>{t('myCard.on')}</span>
            ) : null}
          </span>
          <span className='mt-0.5 block text-[13px] leading-snug text-[var(--muted-foreground)]'>{me ? status : ' '}</span>
        </span>
        <span className='text-[var(--brand)]/60 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]' aria-hidden>
          ›
        </span>
      </Link>
      {me && !me.premium ? (
        <div className='mt-3 flex items-center justify-between gap-3 border-t border-[#F64310]/10 pt-3'>
          <Link href={href('/premium')} className='text-[13px] font-bold text-[var(--brand)]'>
            {me.trialAvailable ? t('cta.trial') : t('cta.start')}
          </Link>
          <Link href={href('/premium/redeem')} className='text-[12.5px] font-semibold text-[var(--muted-foreground)] underline underline-offset-2'>
            {t('redeem.link')}
          </Link>
        </div>
      ) : null}
    </section>
  )
}
