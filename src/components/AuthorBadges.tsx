'use client'

import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

import { SchoolBadge } from './SchoolBadge'

type AuthorBadgesProps = {
  schoolId?: string | null
  workplaceVerified?: boolean
  instagramVerified?: boolean
  /** SchoolBadge와 같은 크기 */
  size?: 'sm' | 'md' | 'author'
  className?: string
}

/**
 * 글·댓글 작성자의 인증 배지 묶음: 학교(대표 학교) · 직장인 · 인스타그램.
 * 인스타그램은 아이디 없이 "인증" 표시만 한다. 값은 서버가 작성자 프로필에서 바로 읽어 붙인다(인증 즉시 반영).
 */
export function AuthorBadges({
  schoolId,
  workplaceVerified,
  instagramVerified,
  size = 'sm',
  className,
}: AuthorBadgesProps) {
  const t = useT('community')
  if (!schoolId && !workplaceVerified && !instagramVerified) return null

  const chip = cn(
    'inline-flex shrink-0 items-center rounded-full font-semibold',
    size === 'author' && 'h-5 gap-0.5 pl-1 pr-1.5 text-[10px] font-bold leading-none ring-1',
    size === 'md' && 'gap-0.5 px-2.5 py-1 text-[11px] ring-1',
    size === 'sm' && 'gap-0.5 px-1.5 py-0.5 text-[9px] font-bold',
  )
  const icon = size === 'sm' ? 'size-2.5' : 'size-3'

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <SchoolBadge schoolId={schoolId} size={size} />
      {workplaceVerified ? (
        <span className={cn(chip, 'bg-[#0f766e]/[0.09] text-[#0f766e] ring-[#0f766e]/15')}>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' className={icon} aria-hidden>
            <path strokeLinecap='round' strokeLinejoin='round' d='M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M4.5 9.5h15v9a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5v-9Z' />
          </svg>
          {t('badges.workplace')}
        </span>
      ) : null}
      {instagramVerified ? (
        <span className={cn(chip, 'bg-[#db2777]/[0.08] text-[#be185d] ring-[#db2777]/15')}>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' className={icon} aria-hidden>
            <rect x='4.5' y='4.5' width='15' height='15' rx='4.5' />
            <circle cx='12' cy='12' r='3.6' />
          </svg>
          {t('badges.instagram')}
        </span>
      ) : null}
    </span>
  )
}
