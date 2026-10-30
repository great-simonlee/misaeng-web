import { useCallback } from 'react'

import { cn } from '@lib'
import { isCompanyIndustry } from '@lib/constants/company'
import { useT } from '@lib/i18n/client'
import { CompanyLogo } from '@widgets/nyc/CompanyLogo'

/** 회사 목록·상세가 같이 쓰는 업계 색, 로고 타일, 업계 태그, 히어로 배경 */

export type Tint = { from: string; to: string; dot: string }

const TINTS: Tint[] = [
  { from: 'var(--brand-bright)', to: 'var(--brand)', dot: '#f97316' },
  { from: '#7c6cff', to: '#4f46e5', dot: '#6366f1' },
  { from: '#34d399', to: '#059669', dot: '#10b981' },
  { from: '#38bdf8', to: '#0369a1', dot: '#0ea5e9' },
  { from: '#f472b6', to: '#be185d', dot: '#ec4899' },
  { from: '#fbbf24', to: '#d97706', dot: '#f59e0b' },
  { from: '#a78bfa', to: '#7c3aed', dot: '#8b5cf6' },
  { from: '#2dd4bf', to: '#0f766e', dot: '#14b8a6' },
  { from: '#64748b', to: '#1e293b', dot: '#64748b' },
]

/** 업계 코드마다 항상 같은 색 */
export function tintFor(code: string): Tint {
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

export const tintGradient = (tint: Tint) => `linear-gradient(135deg, ${tint.from}, ${tint.to})`

/** 로고가 있으면 로고, 없으면 업계 색 그라데이션 모노그램 */
export function CompanyMark({
  company,
  className,
}: {
  company: { name: string; logoUrl: string | null; industry: string }
  className?: string
}) {
  if (company.logoUrl) {
    return (
      <CompanyLogo name={company.name} logoUrl={company.logoUrl} className={cn('p-1', className)} />
    )
  }
  const initial = Array.from(company.name.trim())[0]?.toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-extrabold text-white shadow-inner',
        className
      )}
      style={{ backgroundImage: tintGradient(tintFor(company.industry)) }}
    >
      {initial}
    </span>
  )
}

/**
 * 업계 코드 → 현재 언어 이름 (`companies.industries.<code>`).
 * 관리자가 추가한 모르는 코드는 API가 준 이름(fallback)을 그대로 쓴다.
 */
export function useIndustryLabel(): (code: string, fallback: string) => string {
  const t = useT('companies')
  return useCallback(
    (code: string, fallback: string) =>
      isCompanyIndustry(code) ? t(`industries.${code}`) : fallback,
    [t],
  )
}

/** 업계 색 그라데이션 점 + 업계 이름 (코드로 번역, 모르는 코드는 label). dark 는 어두운 히어로 위 */
export function IndustryTag({
  label,
  industry,
  tone = 'light',
  className,
}: {
  label: string
  industry: string
  tone?: 'light' | 'dark'
  className?: string
}) {
  const industryLabel = useIndustryLabel()
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md py-[3px] pl-1.5 pr-2 text-[11px] font-semibold leading-none tracking-[-0.01em]',
        tone === 'light'
          ? 'bg-white text-[var(--muted-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.07]'
          : 'bg-white/[0.08] text-white/80 ring-1 ring-white/10',
        className
      )}
    >
      <span
        aria-hidden
        className='size-2 shrink-0 rounded-[3px] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.08)]'
        style={{ backgroundImage: tintGradient(tintFor(industry)) }}
      />
      <span className='truncate'>{industryLabel(industry, label)}</span>
    </span>
  )
}

/** 어두운 히어로 패널 (배경 포함). 목록·상세 상단 */
export function CompanyHeroPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-ui='hero-panel'
      className={cn(
        'relative overflow-hidden rounded-[1.5rem] bg-[#0b1020] px-5 pb-5 pt-6 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.5)] sm:px-7 sm:pb-6 sm:pt-7',
        className
      )}
    >
      <div aria-hidden data-ui='hero-decor' className='pointer-events-none absolute inset-0'>
        <div className='absolute -right-24 -top-32 size-[26rem] rounded-full bg-[var(--brand)] opacity-25 blur-[110px]' />
        <div className='absolute -bottom-40 -left-20 size-[22rem] rounded-full bg-[#6d5dfc] opacity-20 blur-[110px]' />
        <div
          className='absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>
      <div className='relative'>{children}</div>
    </div>
  )
}
