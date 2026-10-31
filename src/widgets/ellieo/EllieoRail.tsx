'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { EllieoHousingRow } from '@widgets/ellieo/EllieoHousingRow'
import { ArrowRightIcon } from '@widgets/ellieo/icons'
import { getRoommateHighlights } from '@widgets/ellieo/mockContent'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/**
 * Ellieo side rail: New listings + Roommates · Sublets. Used on the home and next to every
 * narrow page (board lists, post details) so pages share the home's feed + rail layout.
 */

const HOUSING_PREVIEW_COUNT = 4

/** The rail itself; `hideRoommates` on the roommate board (its own list is the page) */
export function EllieoSideRail({ hideRoommates = false }: { hideRoommates?: boolean }) {
  return (
    <aside className='flex min-w-0 flex-col gap-9'>
      <NewListingsRail />
      {hideRoommates ? null : <RoommatesRail />}
    </aside>
  )
}

/* ---------- Side rail: new listings ---------- */

export function NewListingsRail() {
  const t = useT('hub')
  const city = useCity()
  const href = useCityPath()
  const [listings, setListings] = useState<HousingListing[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchHousingListings(city).then((all) => {
      if (!cancelled) setListings(all.slice(0, HOUSING_PREVIEW_COUNT))
    })
    return () => {
      cancelled = true
    }
  }, [city])

  if (listings && listings.length === 0) return null

  return (
    <section className='min-w-0'>
      <FeedHeading size='sm' title={t('ellieo.latestHousing.title')} href={href('/housing')} linkLabel={t('ellieo.seeAll')} />
      {listings === null ? (
        <LoadingState className='py-10' />
      ) : (
        <ul className='mt-1.5 divide-y divide-[var(--border)]'>
          {listings.map((listing) => (
            <li key={listing.id}>
              <EllieoHousingRow listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---------- Side rail: roommates and sublets ---------- */

export function RoommatesRail() {
  const t = useT('hub')
  const tc = useT('community')
  const locale = useLocale()
  const format = useFormat()
  const href = useCityPath()
  const posts = getRoommateHighlights()
  if (posts.length === 0) return null
  const boardPath = ELLIEO_BOARDS.find((board) => board.id === 'roommate')?.path ?? '/roommate'

  return (
    <section className='min-w-0'>
      <FeedHeading
        size='sm'
        title={tc('categories.roommate.title')}
        href={href(boardPath)}
        linkLabel={t('ellieo.seeAll')}
        aside={<SampleTag short />}
      />
      <ul className='mt-1.5 divide-y divide-[var(--border)]'>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={href(boardPath)} className='group block py-2.5'>
              <span className='flex items-center gap-1.5'>
                <span
                  className={
                    post.kind === 'sublet'
                      ? 'rounded-full bg-[var(--ellieo-sun-soft)] px-2 py-px text-[11px] font-bold text-[#9a6200]'
                      : 'rounded-full bg-[#7a4cff14] px-2 py-px text-[11px] font-bold text-[#7a4cff]'
                  }
                >
                  {t(`ellieo.roommates.${post.kind}`)}
                </span>
                <span className='truncate text-[12px] text-[var(--muted)]'>{shortSchool(post.school)}</span>
              </span>
              <span className='mt-1 line-clamp-1 text-[14.5px] font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                {locale === 'vi' ? post.title.vi : post.title.en}
              </span>
              <span className='mt-0.5 block truncate text-[12.5px] text-[var(--muted)]'>
                <span className='font-semibold text-[var(--foreground)]'>
                  {format.usd(post.rent, 0)}
                  {t('ellieo.perMonth')}
                </span>
                {' · '}
                {post.area}
                {' · '}
                {t('ellieo.roommates.from', {
                  date: format.date(`${post.from}T12:00:00`, { day: 'numeric', month: 'short' }),
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "Stony Brook University" → "Stony Brook", "Baruch College" → "Baruch" */
export function shortSchool(school: string): string {
  if (school === 'New York University') return 'NYU'
  return school.replace(/\s+(University|College)$/, '')
}


/* ---------- Shared bits ---------- */

export function FeedHeading({
  title,
  href,
  linkLabel,
  aside,
  size = 'md',
}: {
  title: string
  href?: string
  linkLabel?: string
  aside?: React.ReactNode
  /** sm: side rail blocks */
  size?: 'sm' | 'md'
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <h2
        className={
          size === 'sm'
            ? 'min-w-0 text-[1.1rem] font-extrabold leading-snug tracking-[-0.02em] text-[var(--foreground)]'
            : 'min-w-0 text-[1.3rem] font-extrabold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.5rem]'
        }
      >
        {title}
      </h2>
      <div className='flex shrink-0 items-center gap-2'>
        {aside}
        {href && linkLabel ? (
          <Link
            href={href}
            className='inline-flex items-center gap-0.5 text-[13.5px] font-semibold text-[var(--foreground)] hover:text-[var(--brand)]'
          >
            {linkLabel}
            <ArrowRightIcon className='size-4' />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** Marks sample (mock) data during design review; mock data never ships to production */
export function SampleTag({ short = false }: { short?: boolean }) {
  const t = useT('hub')
  return (
    <span className='whitespace-nowrap rounded-full bg-[var(--ellieo-sun-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
      {t(short ? 'ellieo.sampleShort' : 'ellieo.sampleData')}
    </span>
  )
}
