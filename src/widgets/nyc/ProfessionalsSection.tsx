'use client'

import { useState } from 'react'

import {
  NYC_PROFESSIONAL_CATEGORIES,
  NYC_PROFESSIONALS,
  type NycProfessionalCategoryId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

export function ProfessionalsSection() {
  const t = useT('hub')
  const [activeId, setActiveId] = useState<NycProfessionalCategoryId>(
    NYC_PROFESSIONAL_CATEGORIES[0].id,
  )

  const activePros = NYC_PROFESSIONALS.filter(
    (item) => item.categoryId === activeId,
  )

  return (
    <section aria-label={t('professionals.kicker')}>
      <div className='mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
            {t('professionals.kicker')}
          </p>
          <h2 className='mt-1.5 text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
            {t('professionals.title')}
          </h2>
          <p className='mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]'>
            {t('professionals.description')}
          </p>
        </div>
        <p className='shrink-0 text-xs font-medium text-brand'>
          {t('comingSoon')}
        </p>
      </div>

      {/* 모바일: 탭으로 분야 전환 */}
      <div className='md:hidden'>
        <div
          className='flex gap-2 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          role='tablist'
          aria-label={t('professionals.categoriesAria')}
        >
          {NYC_PROFESSIONAL_CATEGORIES.map((category) => {
            const selected = category.id === activeId
            return (
              <button
                key={category.id}
                type='button'
                role='tab'
                aria-selected={selected}
                onClick={() => setActiveId(category.id)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium touch-manipulation transition',
                  selected
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                )}
              >
                {t(`professionals.categories.${category.id}.title`)}
              </button>
            )
          })}
        </div>

        <p className='mt-2.5 text-xs text-[var(--muted)]'>
          {t(`professionals.categories.${activeId}.description`)}
        </p>

        <ul className='mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]'>
          {activePros.map((pro) => (
            <li key={pro.id} className='py-3'>
              <p className='truncate text-sm font-semibold text-[var(--foreground)]'>
                {t(`professionals.items.${pro.id}.name`)}
              </p>
              <p className='mt-0.5 truncate text-xs text-[var(--muted-foreground)]'>
                {t(`professionals.items.${pro.id}.specialty`)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 데스크톱: 4열 카드 */}
      <div className='hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4'>
        {NYC_PROFESSIONAL_CATEGORIES.map((category) => {
          const pros = NYC_PROFESSIONALS.filter(
            (item) => item.categoryId === category.id,
          )

          return (
            <article
              key={category.id}
              className='rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4'
            >
              <h3 className='text-sm font-semibold text-[var(--foreground)]'>
                {t(`professionals.categories.${category.id}.title`)}
              </h3>
              <p className='mt-1 text-xs leading-relaxed text-[var(--muted)]'>
                {t(`professionals.categories.${category.id}.description`)}
              </p>
              <ul className='mt-3 space-y-2.5 border-t border-[var(--border)] pt-3'>
                {pros.map((pro) => (
                  <li key={pro.id} className='min-w-0'>
                    <p className='truncate text-sm font-medium text-[var(--foreground)]'>
                      {t(`professionals.items.${pro.id}.name`)}
                    </p>
                    <p className='mt-0.5 truncate text-xs text-[var(--muted-foreground)]'>
                      {t(`professionals.items.${pro.id}.specialty`)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
