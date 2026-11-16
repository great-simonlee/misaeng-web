'use client'

import Link from 'next/link'

import { useCity, useCityPath } from '@hooks/useCity'
import { cityFirst, type PublicPosting } from '@lib/company/postings'
import { useFormat, useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CompanyMark } from '@widgets/nyc/CompanyBrand'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { MisaengStoreButtons } from '@widgets/nyc/MisaengStoreButtons'
import { PostingChips } from '@widgets/nyc/PostingCard'

/** 공유 링크에서 바로 보이는 "어떤 일을 하나요" 줄 수. 나머지는 흐리게 가리고 앱으로 보낸다. */
const TEASER_LINES = 3

/**
 * 앱에서 공유한 공고 하나 (/[city]/companies/postings/[id]). 회원이 아니어도 보이는 맛보기:
 * 회사·레벨·제목·지역과 업무 소개 앞 3줄까지. 전체 요약·지원 링크는 앱(misaeng://posting/<id>)에서.
 * posting이 null이면 마감됐거나 내려간 공고.
 */
export function PostingShareScreen({ posting }: { posting: PublicPosting | null }) {
  const href = useCityPath()
  const t = useT('companies')

  return (
    <BoardPageShell>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href('/companies/postings')}
          className='flex w-fit items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> {t('postings.listLink')}
        </Link>
      </header>
      <div className='mt-4 pb-28'>
        {posting ? (
          <PostingTeaser posting={posting} />
        ) : (
          <EmptyState
            title={t('postings.shared.notFoundTitle')}
            description={t('postings.shared.notFoundDescription')}
            actionHref={href('/companies/postings')}
            actionLabel={t('postings.listLink')}
          />
        )}
      </div>
    </BoardPageShell>
  )
}

function PostingTeaser({ posting }: { posting: PublicPosting }) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const format = useFormat()
  const { summary } = posting
  // 보고 있는 도시(뉴욕 등)가 지역 목록 맨 앞에 오도록
  const regions = cityFirst(posting.regions, city)
  const postedDate =
    Number.isFinite(posting.postedAt) && posting.postedAt > 0
      ? format.date(posting.postedAt, { month: 'short', day: 'numeric' })
      : ''
  const shown = summary.overview.slice(0, TEASER_LINES)
  // 흐리게 보이는 부분: 남은 업무 소개 + 자격요건 앞부분 (내용은 앱에서)
  const hidden = [...summary.overview.slice(TEASER_LINES), ...summary.qualifications].slice(0, 4)

  return (
    <article lang={posting.i18n?.state === 'pending' ? posting.i18n.sourceLocale : undefined}>
      <section className='rounded-[1.25rem] bg-white p-4 ring-1 ring-black/[0.06] sm:p-5'>
        <Link
          href={href(`/companies/${posting.company.slug}`)}
          className='flex w-fit items-center gap-2.5 text-[14px] font-semibold text-[var(--foreground)] hover:underline'
        >
          <CompanyMark company={posting.company} className='size-10 rounded-xl text-[15px]' />
          {posting.company.name}
        </Link>
        <PostingChips posting={posting} className='mt-4' />
        <h1 className='mt-2 text-[1.3rem] font-semibold leading-snug tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.45rem]'>
          {posting.title}
        </h1>
        <div className='mt-2.5 space-y-1 text-[13px] text-[var(--muted-foreground)]'>
          {regions.length ? (
            <p className='flex items-start gap-1.5'>
              <PinIcon className='mt-[2px] size-3.5 shrink-0 text-[var(--muted)]' />
              <span>{regions.join(' · ')}</span>
            </p>
          ) : null}
          {postedDate ? <p className='text-[12px] text-[var(--muted)]'>{t('postings.postedOn', { date: postedDate })}</p> : null}
        </div>
      </section>

      <section className='mt-5 px-1'>
        <h2 className='text-[15px] font-bold tracking-tight text-[var(--foreground)]'>{t('postings.overviewTitle')}</h2>
        <ul className='mt-2 space-y-1 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {shown.map((line, i) => (
            <li key={i} className='flex gap-2'>
              <span aria-hidden className='mt-[9px] size-1 shrink-0 rounded-full bg-[var(--brand)]/70' />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {hidden.length ? (
          // 나머지는 흐리게만 (선택·읽기 불가) — 전체는 앱에서
          <div aria-hidden className='relative mt-1 max-h-28 select-none overflow-hidden'>
            <ul className='space-y-1 text-[14px] leading-relaxed text-[var(--muted-foreground)] blur-[2px]'>
              {hidden.map((line, i) => (
                <li key={i} className='flex gap-2'>
                  <span className='mt-[9px] size-1 shrink-0 rounded-full bg-[var(--brand)]/70' />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className='absolute inset-0 bg-gradient-to-b from-white/30 via-white/85 to-white' />
          </div>
        ) : null}
      </section>

      <section className='mt-4 rounded-[1.25rem] bg-[#fafafa] p-4 ring-1 ring-black/[0.05] sm:p-5'>
        <a
          href={`misaeng://posting/${encodeURIComponent(posting.id)}`}
          className='inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-5 text-[16px] font-bold text-white shadow-lg shadow-[var(--brand)]/20 transition hover:brightness-105 active:scale-[0.99]'
        >
          {t('postings.shared.openInAppFull')}
        </a>
        <p className='mt-2.5 text-center text-[12px] leading-relaxed text-[var(--muted)]'>
          {t('postings.shared.teaserNote')}
        </p>
        <p className='mt-5 text-[12px] font-semibold text-[var(--muted-foreground)]'>{t('postings.shared.noApp')}</p>
        <MisaengStoreButtons
          className='mt-2'
          appStoreLabel={t('postings.shared.appStore')}
          googlePlayLabel={t('postings.shared.googlePlay')}
        />
      </section>
    </article>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className={className} aria-hidden>
      <path d='M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z' />
      <circle cx='12' cy='9.5' r='2.5' />
    </svg>
  )
}
