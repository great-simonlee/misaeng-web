'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LoadingState, MarqueeRow } from '@components'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { captureReferralFromLocation } from '@lib/community/referral'
import { NYC_MAGAZINE_PREVIEWS, type NycCategoryId } from '@lib/constants/nyc'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { EllieoHousingTile } from '@widgets/ellieo/EllieoHousingTile'
import { ArrowRightIcon, BadgeCheckIcon, ChatIcon, HeartIcon } from '@widgets/ellieo/icons'
import {
  ELLIEO_CREATORS,
  ELLIEO_PARTNER_ORGS,
  getCommunityHighlights,
  getCreators,
  getPartnerOrgs,
  isMockList,
  type EllieoCreator,
} from '@widgets/ellieo/mockContent'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

const HOUSING_PREVIEW_COUNT = 4

/**
 * Ellieo city home, social-feed style: a stories strip of partner student associations and creators,
 * photo-first new listings, then the community feed (with the magazine beside it on desktop).
 * White page, no boxed cards; board links live in the header / bottom tab bar, trust promises in the footer.
 * Copy: hub.ellieo.* (en + vi). Sample partners/posts: widgets/ellieo/mockContent.
 */
export function EllieoHomeScreen() {
  const t = useT('hub')
  const cityInfo = useCityInfo()

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  return (
    <div className='min-w-0 bg-white'>
      <h1 className='sr-only'>{t('ellieo.intro.title', { city: cityInfo.shortLabel })}</h1>

      <StoriesStrip />

      <NewListings />

      <div className='mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 lg:px-8'>
        <CommunityFeed />
        <MagazineRail />
      </div>
    </div>
  )
}

/* ---------- Stories: partner VSAs + creators ---------- */

type Story = { id: string; mark: string; color: string; name: string; caption: string; url: string | null; ring: string }

const PLATFORM_URL: Record<EllieoCreator['platform'], (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
}

/** Partners get a blue→jade ring, creators a warm one, so the two kinds read apart at a glance */
const PARTNER_RING = 'conic-gradient(from 210deg, #1f5eff, #12b5cb, #0b8f6a, #1f5eff)'
const CREATOR_RING = 'conic-gradient(from 210deg, #f2a516, #ff5a5f, #c13584, #f2a516)'

function StoriesStrip() {
  const t = useT('hub')
  const format = useFormat()
  const orgs = getPartnerOrgs()
  const creators = getCreators()

  const stories: Story[] = [
    ...orgs.map((org) => ({
      id: org.id,
      mark: org.mark,
      color: org.color,
      name: org.name,
      caption: t('ellieo.stories.partner'),
      url: org.instagram ? `https://instagram.com/${org.instagram}` : null,
      ring: PARTNER_RING,
    })),
    ...creators.map((creator) => ({
      id: creator.id,
      mark: creator.name.charAt(0),
      color: creator.color,
      name: creator.name,
      caption: `${t(`ellieo.creators.platforms.${creator.platform}`)} ${format.number(creator.followers, {
        notation: 'compact',
        maximumFractionDigits: 1,
      })}`,
      url: creator.handle ? PLATFORM_URL[creator.platform](creator.handle) : null,
      ring: CREATOR_RING,
    })),
  ]
  if (stories.length === 0) return null
  const sample = isMockList(orgs, ELLIEO_PARTNER_ORGS) || isMockList(creators, ELLIEO_CREATORS)

  return (
    <section className='mx-auto w-full max-w-7xl pt-4 sm:pt-6'>
      <div className='flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8'>
        <h2 className='text-[13px] font-semibold text-[var(--muted)]'>{t('ellieo.stories.title')}</h2>
        {sample ? <SampleTag /> : null}
      </div>
      {/* Slides by itself; pauses on hover, stops for reduced motion (partner-marquee in globals.css) */}
      <MarqueeRow className='mt-2 lg:mx-8'>
        {stories.map((story) => {
          const inner = (
            <>
              <span className='rounded-full p-[2px]' style={{ background: story.ring }}>
                <span className='block rounded-full bg-white p-[2px]'>
                  <span
                    aria-hidden
                    className='flex size-[3.25rem] items-center justify-center rounded-full text-[13px] font-bold tracking-tight text-white'
                    style={{ background: story.color }}
                  >
                    {story.mark}
                  </span>
                </span>
              </span>
              <span className='mt-1 block w-full truncate text-center text-[12px] font-semibold text-[var(--foreground)]'>
                {story.name}
              </span>
              <span className='block w-full truncate text-center text-[10.5px] text-[var(--muted)]'>{story.caption}</span>
            </>
          )
          const itemClass = 'flex w-[5.5rem] shrink-0 flex-col items-center px-0.5 py-1'
          return story.url ? (
            <a key={story.id} href={story.url} target='_blank' rel='noopener noreferrer' className={itemClass}>
              {inner}
            </a>
          ) : (
            <div key={story.id} className={itemClass}>
              {inner}
            </div>
          )
        })}
      </MarqueeRow>
    </section>
  )
}

/* ---------- New listings: photo tiles ---------- */

function NewListings() {
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
    <section className='mx-auto w-full max-w-7xl pt-7 sm:pt-9'>
      <div className='px-4 sm:px-6 lg:px-8'>
        <FeedHeading title={t('ellieo.latestHousing.title')} href={href('/housing')} linkLabel={t('ellieo.seeAll')} />
      </div>
      {listings === null ? (
        <LoadingState className='py-12' />
      ) : (
        <div className='mt-3 overflow-x-auto [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden'>
          <ul className='flex snap-x snap-mandatory gap-3 px-4 sm:px-6 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-5 lg:px-8'>
            {listings.map((listing) => (
              <li key={listing.id} className='w-[82%] max-w-[21rem] shrink-0 snap-start sm:w-[18rem] lg:w-auto lg:max-w-none'>
                <EllieoHousingTile listing={listing} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ---------- Community feed ---------- */

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1f5eff, #12b5cb)',
  'linear-gradient(135deg, #0b8f6a, #7fd8b8)',
  'linear-gradient(135deg, #f2a516, #ff5a5f)',
  'linear-gradient(135deg, #7a4cff, #c13584)',
  'linear-gradient(135deg, #e0475b, #f2a516)',
  'linear-gradient(135deg, #12a4c7, #1f5eff)',
]

/** Board tag colors in the feed (text on a soft tint of the same hue) */
const BOARD_TONE: Partial<Record<NycCategoryId, string>> = {
  status: '#1f5eff',
  housing: '#0b8f6a',
  roommate: '#7a4cff',
  food: '#d4870a',
  'job-review': '#0e1a2f',
  events: '#d6336c',
  anonymous: '#5b6779',
  marketplace: '#12a4c7',
}

/** Posts at or above this many likes get the Trending tag */
const TRENDING_LIKES = 40

/** "Stony Brook University" → "Stony Brook", "Baruch College" → "Baruch" */
function shortSchool(school: string): string {
  if (school === 'New York University') return 'NYU'
  return school.replace(/\s+(University|College)$/, '')
}

function gradientFor(text: string): string {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

function CommunityFeed() {
  const t = useT('hub')
  const tc = useT('community')
  const locale = useLocale()
  const format = useFormat()
  const href = useCityPath()
  const posts = getCommunityHighlights()
  const [filter, setFilter] = useState<NycCategoryId | 'all'>('all')
  // Fixed at mount so "3 hours ago" doesn't change between renders
  const [now] = useState(() => Date.now())
  if (posts.length === 0) return <div />

  // Chips only for boards that have posts, in the Ellieo board order
  const boards = ELLIEO_BOARDS.filter((board) => posts.some((post) => post.board === board.id))
  const visible = filter === 'all' ? posts : posts.filter((post) => post.board === filter)
  const writeBoard = ELLIEO_BOARDS.find((board) => board.id === (filter === 'all' ? 'anonymous' : filter))

  return (
    <section className='min-w-0'>
      <FeedHeading title={t('ellieo.community.title')} aside={<SampleTag />} />

      {/* Composer: looks like an input, opens the write page of the selected board */}
      <Link
        href={href(`${writeBoard?.path ?? '/anonymous'}/new`)}
        className='mt-4 flex items-center gap-3 rounded-full bg-[var(--surface)] py-1.5 pl-1.5 pr-1.5 transition hover:bg-[var(--border)]'
      >
        <span aria-hidden className='size-9 shrink-0 rounded-full bg-[linear-gradient(135deg,#1f5eff,#12b5cb)]' />
        <span className='min-w-0 flex-1 truncate text-[14.5px] text-[var(--muted)]'>{t('ellieo.community.composer')}</span>
        <span className='shrink-0 rounded-full bg-[var(--foreground)] px-4 py-2 text-[13.5px] font-semibold text-white'>
          {t('ellieo.community.post')}
        </span>
      </Link>

      {/* Board filter chips */}
      <div className='-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'>
        <div role='tablist' aria-label={t('ellieo.community.title')} className='flex w-max gap-2'>
          {[{ id: 'all' as const, label: t('ellieo.community.all') }, ...boards.map((board) => ({ id: board.id, label: tc(`categories.${board.id}.title`) }))].map(
            (chip) => {
              const active = filter === chip.id
              return (
                <button
                  key={chip.id}
                  type='button'
                  role='tab'
                  aria-selected={active}
                  onClick={() => setFilter(chip.id)}
                  className={
                    active
                      ? 'h-9 rounded-full bg-[var(--foreground)] px-4 text-[13.5px] font-semibold text-white'
                      : 'h-9 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)] transition hover:ring-[var(--border-muted)]'
                  }
                >
                  {chip.label}
                </button>
              )
            },
          )}
        </div>
      </div>

      <ul className='mt-2'>
        {visible.map((post) => {
          const board = ELLIEO_BOARDS.find((item) => item.id === post.board)
          const BoardIcon = board?.icon
          const tone = BOARD_TONE[post.board] ?? '#5b6779'
          return (
            <li key={post.id} className='border-b border-[var(--border)] last:border-b-0'>
              <Link href={href(board?.path ?? '/')} className='group block py-5'>
                {/* Author line */}
                <span className='flex items-center gap-2.5'>
                  <span
                    aria-hidden
                    className='flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold uppercase text-white'
                    style={{ background: gradientFor(post.nickname) }}
                  >
                    {post.nickname.charAt(0)}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='flex min-w-0 items-center gap-1 text-[14px] font-semibold text-[var(--foreground)]'>
                      <span className='truncate'>{post.nickname}</span>
                      <BadgeCheckIcon className='size-4 shrink-0 text-[var(--ellieo-jade)]' />
                    </span>
                    <span className='block truncate text-[12.5px] text-[var(--muted)]'>
                      {shortSchool(post.school)} · {format.relative(now - post.hoursAgo * 3_600_000)}
                    </span>
                  </span>
                  <span
                    className='inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold'
                    style={{ color: tone, background: `${tone}14` }}
                  >
                    {BoardIcon ? <BoardIcon className='size-3.5' /> : null}
                    {tc(`categories.${post.board}.title`)}
                  </span>
                </span>

                {/* Body */}
                <span className='mt-3 block text-[16.5px] font-bold leading-snug tracking-[-0.015em] text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                  {post.likes >= TRENDING_LIKES ? (
                    <span className='mr-1.5 inline-flex -translate-y-px items-center rounded-full bg-[var(--ellieo-sun-soft)] px-2 py-0.5 align-middle text-[11.5px] font-bold text-[#9a6200]'>
                      {t('ellieo.community.trending')}
                    </span>
                  ) : null}
                  {locale === 'vi' ? post.title.vi : post.title.en}
                </span>
                <span className='mt-1 line-clamp-2 block text-[14.5px] leading-relaxed text-[var(--muted-foreground)]'>
                  {locale === 'vi' ? post.excerpt.vi : post.excerpt.en}
                </span>

                {/* Reactions */}
                <span className='mt-3 flex items-center gap-1 text-[13px] font-semibold text-[var(--muted)]'>
                  <span className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition group-hover:bg-[var(--surface)]'>
                    <HeartIcon className='size-[18px]' />
                    {format.number(post.likes)}
                  </span>
                  <span className='inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition group-hover:bg-[var(--surface)]'>
                    <ChatIcon className='size-[18px]' />
                    {format.number(post.comments)}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------- Magazine: side rail on desktop, below the feed on phones ---------- */

function MagazineRail() {
  const t = useT('hub')
  return (
    <aside className='min-w-0'>
      <FeedHeading
        title={t('magazine.title')}
        aside={
          <span className='rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>
            {t('comingSoon')}
          </span>
        }
      />
      <ul className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1'>
        {NYC_MAGAZINE_PREVIEWS.map((item) => (
          <li key={item.id} className='flex min-w-0 items-center gap-3'>
            <span className='relative aspect-square w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[var(--surface)]'>
              <Image src={item.image} alt='' fill loading='eager' className='object-cover' sizes='72px' />
            </span>
            <span className='min-w-0'>
              <span className='block text-[12px] font-semibold text-[var(--brand)]'>
                {t(`magazine.items.${item.id}.tag`)}
              </span>
              <span className='mt-0.5 line-clamp-2 block text-[14.5px] font-semibold leading-snug text-[var(--foreground)]'>
                {t(`magazine.items.${item.id}.title`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/* ---------- Shared bits ---------- */

function FeedHeading({
  title,
  href,
  linkLabel,
  aside,
}: {
  title: string
  href?: string
  linkLabel?: string
  aside?: React.ReactNode
}) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <h2 className='min-w-0 text-[1.3rem] font-extrabold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.5rem]'>
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className='inline-flex shrink-0 items-center gap-0.5 text-[14px] font-semibold text-[var(--foreground)] hover:text-[var(--brand)]'
        >
          {linkLabel}
          <ArrowRightIcon className='size-4' />
        </Link>
      ) : null}
      {aside ? <div className='shrink-0'>{aside}</div> : null}
    </div>
  )
}

/** Marks sample (mock) data during design review; mock data never ships to production */
function SampleTag() {
  const t = useT('hub')
  return (
    <span className='rounded-full bg-[var(--ellieo-sun-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
      {t('ellieo.sampleData')}
    </span>
  )
}
