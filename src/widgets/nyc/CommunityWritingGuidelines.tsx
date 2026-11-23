'use client'

import {
  ANONYMOUS_WRITING_GUIDELINE_KEYS,
  COMMUNITY_WRITING_GUIDELINE_KEYS,
} from '@lib/constants/communityGuidelines'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'
import { MISAENG_DESIGN } from '@lib/brand/design'

type CommunityWritingGuidelinesProps = {
  /** 익명게시판: 공통 + 익명 전용 안내를 강조 표시 */
  anonymous?: boolean
  className?: string
}

/** 글쓰기 화면용 커뮤니티 이용 안내 */
export function CommunityWritingGuidelines({
  anonymous = false,
  className,
}: CommunityWritingGuidelinesProps) {
  const t = useT('community')
  if (MISAENG_DESIGN) {
    // Misaeng (owner 11-23): a clear white card with a shield badge, dark text and brand bullets — the gray box was too faint
    const items = [
      ...COMMUNITY_WRITING_GUIDELINE_KEYS.map((item) => t(`guidelines.common.${item}`)),
      ...(anonymous ? ANONYMOUS_WRITING_GUIDELINE_KEYS.map((item) => t(`guidelines.anonymous.${item}`)) : []),
    ]
    return (
      <section className={cn('rounded-[1.375rem] border-2 border-[var(--brand)]/25 bg-[linear-gradient(160deg,#FFF4EE_0%,#FFFFFF_60%)] p-5 sm:p-6', className)}>
        <h2 className='flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>
          <span className='flex size-8 items-center justify-center rounded-xl bg-[var(--brand)] text-white' aria-hidden>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='size-4'>
              <path d='M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z' />
              <path d='M9 12l2 2 4-4' />
            </svg>
          </span>
          {anonymous ? t('guidelines.anonymousTitle') : t('guidelines.commonTitle')}
        </h2>
        <ul className='mt-3.5 space-y-2.5'>
          {items.map((text, index) => (
            <li key={index} className='flex gap-2.5 text-[14px] font-medium leading-relaxed text-[var(--foreground)]'>
              <span className='mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3.5 text-[13px] leading-relaxed ring-1',
        anonymous
          ? 'bg-brand-soft text-[var(--muted-foreground)] ring-[var(--brand)]/18'
          : 'bg-[#f4f5f7] text-[var(--muted-foreground)] ring-black/[0.06]',
        className,
      )}
    >
      <p
        className={cn(
          'text-[12px] font-semibold',
          anonymous ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
        )}
      >
        {anonymous
          ? t('guidelines.anonymousTitle')
          : t('guidelines.commonTitle')}
      </p>
      <ul className='mt-2 space-y-1.5'>
        {COMMUNITY_WRITING_GUIDELINE_KEYS.map((item) => (
          <li key={item} className='flex gap-2'>
            <span
              className={cn(
                'mt-1.5 size-1 shrink-0 rounded-full',
                anonymous ? 'bg-[var(--brand)]/70' : 'bg-[var(--muted)]',
              )}
              aria-hidden
            />
            <span>{t(`guidelines.common.${item}`)}</span>
          </li>
        ))}
        {anonymous
          ? ANONYMOUS_WRITING_GUIDELINE_KEYS.map((item) => (
              <li key={item} className='flex gap-2'>
                <span
                  className='mt-1.5 size-1 shrink-0 rounded-full bg-[var(--brand)]/70'
                  aria-hidden
                />
                <span className='font-medium text-[var(--foreground)]/85'>
                  {t(`guidelines.anonymous.${item}`)}
                </span>
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}
