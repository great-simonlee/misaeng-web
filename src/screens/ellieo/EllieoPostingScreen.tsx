'use client'

import { PinIcon } from '@widgets/ellieo/icons'
import Link from 'next/link'

import { useCity, useCityPath } from '@hooks/useCity'
import { cityFirst, type PublicPosting } from '@lib/company/postings'
import { useFormat, useT } from '@lib/i18n/client'
import { CompanyMark } from '@widgets/nyc/CompanyBrand'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { PostingChips } from '@widgets/nyc/PostingCard'

/** Lines of "what you'll do" shown on a shared link; the rest stays for members on the postings list */
const TEASER_LINES = 3

/**
 * Ellieo shared posting page (/[city]/companies/postings/[id]): a logo-first card (company, level chips, title,
 * place, date), the first lines of the overview, and links into the company page and the postings list.
 * Same teaser rule as Misaeng's PostingShareScreen, without the Misaeng app hand-off (Ellieo has no app yet).
 */
export function EllieoPostingScreen({ posting }: { posting: PublicPosting | null }) {
  const href = useCityPath()
  const t = useT('companies')

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-14 pt-4'>
        <Link
          href={href('/companies/postings')}
          className='inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
        >
          ‹ {t('postings.listLink')}
        </Link>
        <div className='mt-3'>
          {posting ? (
            <Teaser posting={posting} />
          ) : (
            <EmptyState
              title={t('postings.shared.notFoundTitle')}
              description={t('postings.shared.notFoundDescription')}
              actionHref={href('/companies/postings')}
              actionLabel={t('postings.listLink')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Teaser({ posting }: { posting: PublicPosting }) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const format = useFormat()
  const regions = cityFirst(posting.regions, city)
  const postedDate =
    Number.isFinite(posting.postedAt) && posting.postedAt > 0 ? format.date(posting.postedAt, { month: 'short', day: 'numeric' }) : ''
  const shown = posting.summary.overview.slice(0, TEASER_LINES)
  const hidden = [...posting.summary.overview.slice(TEASER_LINES), ...posting.summary.qualifications].slice(0, 4)

  return (
    <article lang={posting.i18n?.state === 'pending' ? posting.i18n.sourceLocale : undefined} className='space-y-3'>
      {/* Logo-first card */}
      <section className='rounded-[1.75rem] bg-white p-5 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'>
        <Link href={href(`/companies/${posting.company.slug}`)} className='flex items-center gap-3'>
          <CompanyMark company={posting.company} className='size-14 rounded-[1rem] text-[22px]' />
          <span className='min-w-0'>
            <span className='block truncate text-[16px] font-extrabold text-[var(--foreground)]'>{posting.company.name}</span>
            {postedDate ? (
              <span className='block text-[12.5px] text-[var(--muted)]'>{t('postings.postedOn', { date: postedDate })}</span>
            ) : null}
          </span>
        </Link>
        <PostingChips posting={posting} className='mt-4' />
        <h1 className='mt-2.5 text-[22px] font-extrabold leading-snug tracking-[-0.03em] text-[var(--foreground)]'>{posting.title}</h1>
        {regions.length ? (
          <p className='mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1 text-[13px] font-semibold text-[var(--muted-foreground)]'>
            <PinIcon className='size-4 shrink-0' />
            {regions.join(' · ')}
          </p>
        ) : null}
      </section>

      {/* What you'll do */}
      <section className='rounded-[1.5rem] bg-[var(--surface)] p-5'>
        <h2 className='text-[17px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>{t('postings.overviewTitle')}</h2>
        <ul className='mt-2.5 space-y-1.5 text-[14.5px] leading-relaxed text-[var(--muted-foreground)]'>
          {shown.map((line, index) => (
            <li key={index} className='flex gap-2.5'>
              <span aria-hidden className='mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {hidden.length ? (
          <div aria-hidden className='relative mt-1.5 max-h-24 select-none overflow-hidden'>
            <ul className='space-y-1.5 text-[14.5px] leading-relaxed text-[var(--muted-foreground)] blur-[2px]'>
              {hidden.map((line, index) => (
                <li key={index} className='flex gap-2.5'>
                  <span className='mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className='absolute inset-0 bg-gradient-to-b from-transparent via-[var(--surface)]/80 to-[var(--surface)]' />
          </div>
        ) : null}
      </section>

      {/* Where to go next */}
      <div className='grid gap-2 sm:grid-cols-2'>
        <Link
          href={href(`/companies/${posting.company.slug}`)}
          className='inline-flex h-12 items-center justify-center rounded-full bg-[var(--brand)] px-5 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
        >
          {posting.company.name} ›
        </Link>
        <Link
          href={href('/companies/postings')}
          className='inline-flex h-12 items-center justify-center rounded-full bg-[var(--surface)] px-5 text-[15px] font-bold text-[var(--foreground)] transition hover:bg-[var(--border)]'
        >
          {t('postings.listLink')}
        </Link>
      </div>
    </article>
  )
}
