'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { MarqueeRow } from '@components'
import { useCityInfo, useCityPath } from '@hooks/useCity'
import { captureReferralFromLocation } from '@lib/community/referral'
import type { NycCategoryId } from '@lib/constants/nyc'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import { BadgeCheckIcon, ChatIcon, HeartIcon } from '@widgets/ellieo/icons'
import {
  ELLIEO_CREATORS,
  ELLIEO_PARTNER_ORGS,
  getCommunityHighlights,
  getCreators,
  getPartnerOrgs,
  isMockList,
  type EllieoCreator,
} from '@widgets/ellieo/mockContent'
import { EllieoSideRail, FeedHeading, SampleTag, shortSchool } from '@widgets/ellieo/EllieoRail'
import { BOARD_TONE, ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/**
 * Ellieo city home, social-feed style: a stories strip of partner student associations and creators,
 * then the community feed with a side rail of new listings and roommates/sublets (below the feed on phones).
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
    // flex-1: fill the layout's main column so no gray canvas shows above the footer
    <div className='min-w-0 flex-1 bg-white'>
      <h1 className='sr-only'>{t('ellieo.intro.title', { city: cityInfo.shortLabel })}</h1>

      <StoriesStrip />

      {/* Feed on the left; new listings and roommates/sublets as two separate blocks in the side rail */}
      <div className='mx-auto grid w-full max-w-7xl gap-10 px-4 pb-2 pt-7 sm:px-6 sm:pt-9 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14 lg:px-8'>
        <CommunityFeed />
        <EllieoSideRail />
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
  const href = useCityPath()
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
        <div className='flex shrink-0 items-center gap-2'>
          {sample ? <SampleTag /> : null}
          <Link href={href('/partners')} className='text-[13px] font-semibold text-[var(--foreground)] hover:text-[var(--brand)]'>
            {t('ellieo.seeAll')}
          </Link>
        </div>
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

/** Housing and roommates/sublets have their own blocks in the side rail, so the feed leaves them out */
const FEED_EXCLUDED_BOARDS: readonly NycCategoryId[] = ['housing', 'roommate']

/** Posts at or above this many likes get the Trending tag */
const TRENDING_LIKES = 40

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
  const posts = getCommunityHighlights().filter((post) => !FEED_EXCLUDED_BOARDS.includes(post.board))
  const [filter, setFilter] = useState<NycCategoryId | 'all'>('all')
  // Fixed at mount so "3 hours ago" doesn't change between renders
  const [now] = useState(() => Date.now())
  if (posts.length === 0) return <div />

  // Chips only for boards that have posts, in the Ellieo board order
  const boards = ELLIEO_BOARDS.filter((board) => posts.some((post) => post.board === board.id))
  const visible = filter === 'all' ? posts : posts.filter((post) => post.board === filter)

  return (
    <section className='min-w-0'>
      <FeedHeading title={t('ellieo.community.title')} aside={<SampleTag />} />

      {/* Board filter chips */}
      <div className='-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'>
        <div role='tablist' aria-label={t('ellieo.community.title')} className='flex w-max gap-1.5'>
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
                      ? 'h-8 rounded-full bg-[var(--foreground)] px-3.5 text-[13px] font-semibold text-white'
                      : 'h-8 rounded-full bg-white px-3.5 text-[13px] font-semibold text-[var(--muted-foreground)] ring-1 ring-inset ring-[var(--border)] transition hover:ring-[var(--border-muted)]'
                  }
                >
                  {chip.label}
                </button>
              )
            },
          )}
        </div>
      </div>

      <ul className='mt-1'>
        {visible.map((post) => {
          const board = ELLIEO_BOARDS.find((item) => item.id === post.board)
          const BoardIcon = board?.icon
          const tone = BOARD_TONE[post.board] ?? '#5b6779'
          const anonymous = post.board === 'anonymous'
          return (
            <li key={post.id} className='border-b border-[var(--border)] last:border-b-0'>
              <Link href={href(board?.path ?? '/')} data-ui='hover-row' className='group block py-3.5'>
                {/* Author line: one row. Anonymous Q&A hides nickname and school, like the board itself (lib/community/anonymous) */}
                <span className='flex items-center gap-2'>
                  <span
                    aria-hidden
                    className='flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase text-white'
                    style={{ background: anonymous ? '#9aa4b2' : gradientFor(post.nickname) }}
                  >
                    {anonymous ? '?' : post.nickname.charAt(0)}
                  </span>
                  <span className='flex min-w-0 flex-1 items-center gap-1 text-[12.5px]'>
                    <span className='truncate font-semibold text-[var(--foreground)]'>
                      {anonymous ? t('ellieo.community.anonymous') : post.nickname}
                    </span>
                    <BadgeCheckIcon className='size-3.5 shrink-0 text-[var(--ellieo-jade)]' />
                    <span className='truncate text-[var(--muted)]'>
                      {anonymous ? '' : ` · ${shortSchool(post.school)}`} · {format.relative(now - post.hoursAgo * 3_600_000)}
                    </span>
                  </span>
                  <span
                    className='inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11.5px] font-semibold sm:px-2 sm:py-0.5'
                    style={{ color: tone, background: `${tone}14` }}
                  >
                    {BoardIcon ? <BoardIcon className='size-3' /> : null}
                    {/* Phones: icon only, so the nickname has room */}
                    <span className='sr-only sm:not-sr-only'>{tc(`categories.${post.board}.title`)}</span>
                  </span>
                </span>

                {/* Body */}
                <span className='mt-1.5 line-clamp-1 text-[15px] font-bold leading-snug tracking-[-0.01em] text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                  {post.likes >= TRENDING_LIKES ? (
                    <span className='mr-1.5 inline-flex -translate-y-px items-center rounded-full bg-[var(--ellieo-sun-soft)] px-1.5 py-px align-middle text-[11px] font-bold text-[#9a6200]'>
                      {t('ellieo.community.trending')}
                    </span>
                  ) : null}
                  {locale === 'vi' ? post.title.vi : post.title.en}
                </span>
                <span className='mt-0.5 line-clamp-1 text-[13.5px] leading-relaxed text-[var(--muted)]'>
                  {locale === 'vi' ? post.excerpt.vi : post.excerpt.en}
                </span>

                {/* Reactions */}
                <span className='mt-1.5 flex items-center gap-3.5 text-[12.5px] font-medium text-[var(--muted)]'>
                  <span className='inline-flex items-center gap-1'>
                    <HeartIcon className='size-4' />
                    {format.number(post.likes)}
                  </span>
                  <span className='inline-flex items-center gap-1'>
                    <ChatIcon className='size-4' />
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

