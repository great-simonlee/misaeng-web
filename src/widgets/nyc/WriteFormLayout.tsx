'use client'

import type { ReactNode } from 'react'

import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

/**
 * Misaeng web write screens (owner 11-23): the 중고거래 물건 올리기 layout for every board — numbered step cards on the
 * left, a sticky column with the form's own options + "아직 입력하지 않은 항목" + submit on the right. No generic rail
 * (다른 게시판 / 앱 받기) on write pages. Phones: one column, the primary submit pinned to the bottom.
 * Layout only: each screen keeps its own fields, validation, drafts and submit.
 */

/** Left/right grid. Render inside the screen's <form> so submit buttons in the aside still submit it. */
export function WriteColumns({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className='mt-6 grid gap-4 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:pb-16'>
      <div className='flex min-w-0 flex-col gap-4'>{main}</div>
      <div className='flex flex-col gap-4 lg:sticky lg:top-[5.5rem]'>{aside}</div>
    </div>
  )
}

/** Page header: back link, big title, intro — title left edge on the nav line */
export function WritePageHeader({ back, title, intro, children }: { back?: ReactNode; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className='pt-4 sm:pt-5 lg:pt-6'>
      {back}
      <h1 className='text-[1.75rem] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem] lg:text-[2.5rem]'>
        {title}
      </h1>
      {intro ? <div className='mt-3 text-[14px] leading-relaxed text-[var(--muted)] lg:text-[15px]'>{intro}</div> : null}
      {children}
    </header>
  )
}

/** A numbered white step card (same look as the 물건 올리기 sections) */
export function WriteStepCard({
  step,
  title,
  description,
  trailing,
  id,
  className,
  children,
}: {
  step?: number
  title: ReactNode
  description?: ReactNode
  trailing?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6', className)}>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-start gap-2'>
          {step ? (
            <span className='mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] text-[12px] font-extrabold text-[var(--brand)]'>
              {step}
            </span>
          ) : null}
          <div className='min-w-0'>
            <h2 className='text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{title}</h2>
            {description ? <p className='mt-0.5 text-[12.5px] leading-relaxed text-[var(--muted)]'>{description}</p> : null}
          </div>
        </div>
        {trailing ? <div className='shrink-0 text-[13px] font-semibold text-[var(--muted)]'>{trailing}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Right-column card (form options) */
export function WriteAsideCard({ title, className, children }: { title?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6', className)}>
      {title ? <h2 className='mb-3 text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{title}</h2> : null}
      {children}
    </section>
  )
}

/**
 * Submit card: "아직 입력하지 않은 항목" + the screen's submit (desktop), extra links under it.
 * `submit` is also pinned to the bottom on phones/tablets — pass a button that works in both places (type='submit').
 */
export function WriteSubmitCard({ missing, submit, extra }: { missing?: string[]; submit: ReactNode; extra?: ReactNode }) {
  const t = useT('community')
  const missingLine =
    missing && missing.length > 0 ? (
      <p className='mb-2 text-center text-[12.5px] leading-relaxed text-[var(--muted)] lg:text-left'>
        {t('market.missing', { items: missing.join(', ') })}
      </p>
    ) : null
  return (
    <>
      <section className='rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6'>
        <div className='hidden lg:block'>
          {missingLine}
          {submit}
        </div>
        {extra ? <div className='space-y-2 lg:mt-4'>{extra}</div> : null}
      </section>
      <div className='fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden'>
        {missingLine}
        {submit}
      </div>
    </>
  )
}

/** The orange primary submit used on every write page */
export const writeSubmitClass =
  'inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:shadow-none touch-manipulation'

/**
 * Turns a screen's existing direct-child <section>s into numbered white step cards (CSS only, so the sections' own
 * fields and logic stay untouched). Put it on the element that wraps the sections.
 */
export const writeCardStackClass = cn(
  'flex flex-col gap-4 [counter-reset:wstep]',
  '[&>section]:relative [&>section]:mt-0 [&>section]:rounded-[1.375rem] [&>section]:bg-white [&>section]:p-5 [&>section]:pl-14 [&>section]:ring-1 [&>section]:ring-[var(--card-ring)] sm:[&>section]:p-6 sm:[&>section]:pl-[3.75rem]',
  '[&>section]:[counter-increment:wstep]',
  "[&>section]:before:absolute [&>section]:before:left-5 [&>section]:before:top-[22px] [&>section]:before:flex [&>section]:before:size-6 [&>section]:before:items-center [&>section]:before:justify-center [&>section]:before:rounded-full [&>section]:before:bg-[#FFF1E8] [&>section]:before:text-[12px] [&>section]:before:font-extrabold [&>section]:before:text-[var(--brand)] [&>section]:before:content-[counter(wstep)] sm:[&>section]:before:left-6 sm:[&>section]:before:top-[26px]",
)
