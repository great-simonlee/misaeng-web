'use client'

import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { captureReferralFromLocation } from '@lib/community/referral'
import { cityLoginPath, hrefForHousingListing } from '@lib/constants/cities'
import {
  formatListingBedBath,
  getHousingUnitRent,
  getListingArea,
  getListingImages,
} from '@lib/constants/housingMock'
import { resolveMergedCommunityBoardId, type NycCategoryId } from '@lib/constants/nyc'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import type { CommunityPost, HousingListing } from '@/types/nyc'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import { EllieoBoardTag, EllieoFeedCard, EllieoPersonAvatar } from '@widgets/ellieo/EllieoFeedCard'
import {
  getCommunityHighlights,
} from '@widgets/ellieo/mockContent'
import { EllieoSideRail, FeedHeading, RoommatesRail, SampleTag, shortSchool } from '@widgets/ellieo/EllieoRail'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'
import { communityForBoard } from '@widgets/ellieo/communities'

/**
 * Ellieo city home, community design (docs/design/ellieo-community.md): a slim join row for visitors, then the
 * feed of flat post rows from every community; right sidebar (desktop) with new listings and roommates/sublets.
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
    // flex-1: fill the layout's main column above the footer
    <div className='min-w-0 flex-1 bg-white'>
      <h1 className='sr-only'>{t('ellieo.intro.title', { city: cityInfo.shortLabel })}</h1>
      {/* One 640px feed column; the side rail (new listings, roommates) joins it from 1280px */}
      <div className='mx-auto grid w-full max-w-[40rem] gap-8 px-4 pb-4 pt-1 lg:max-w-[60rem] lg:grid-cols-[minmax(0,40rem)_18.75rem] lg:justify-center lg:pt-4'>
        <div className='min-w-0'>
          <JoinRow />
          <CommunityFeed />
        </div>
        <div className='hidden lg:block'>
          <div className='sticky top-24'>
            <EllieoSideRail />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Logged out: one slim join row above the feed ---------- */

function JoinRow() {
  const tn = useT('nav')
  const city = useCity()
  const cityInfo = useCityInfo()
  const { user, loading } = useEllieoViewer()
  if (loading || user) return null
  return (
    <div className='flex items-center gap-3 border-b border-[var(--border)] py-3'>
      <p className='min-w-0 flex-1 text-[14px] font-medium leading-snug text-[var(--foreground)]'>
        {tn('ellieo.joinRow', { city: cityInfo.name })}
      </p>
      <Link
        href={`${cityLoginPath(city)}?mode=signup`}
        className='inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
      >
        {tn('ellieo.signUp')}
      </Link>
    </div>
  )
}

/* ---------- No feed yet: board shortcuts as emoji tiles ---------- */

function ExploreBoards() {
  const t = useT('hub')
  const tc = useT('community')
  const href = useCityPath()
  const cityInfo = useCityInfo()
  const boards = ELLIEO_BOARDS.filter((board) => board.available && !TAB_BAR_BOARDS.includes(board.id))

  return (
    <section className='min-w-0'>
      <FeedHeading title={t('ellieo.explore.title')} />
      <p className='mt-1 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {t('ellieo.explore.subtitle', { city: cityInfo.shortLabel })}
      </p>
      <ul className='mt-4 grid grid-cols-2 gap-2.5'>
        {boards.map((board) => (
          <li key={board.id}>
            <Link
              href={href(board.path)}
              className='flex h-full flex-col gap-2 rounded-[1.25rem] bg-[var(--surface)] p-4 transition hover:bg-[var(--border)]'
            >
              <EllieoIconBadge icon={board.icon} size={44} />
              <span className='text-[15px] font-bold leading-tight text-[var(--foreground)]'>
                {tc(`categories.${board.id}.title`)}
              </span>
              <span className='line-clamp-2 text-[12.5px] leading-snug text-[var(--muted-foreground)]'>
                {tc(`categories.${board.id}.description`, { city: cityInfo.shortLabel })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

const TAB_BAR_BOARDS: NycCategoryId[] = ['housing', 'food', 'marketplace', 'status', 'job-review', 'anonymous']

/* ---------- New listings strip inside the feed (phones / tablets; the side rail has them from 1280px) ---------- */

function ListingsStrip() {
  const t = useT('hub')
  const city = useCity()
  const href = useCityPath()
  const format = useFormat()
  const [listings, setListings] = useState<HousingListing[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchHousingListings(city).then((all) => {
      if (!cancelled) setListings(all.slice(0, 6))
    })
    return () => {
      cancelled = true
    }
  }, [city])

  if (!listings || listings.length === 0) return null
  return (
    <section className='xl:hidden'>
      <FeedHeading size='sm' title={t('ellieo.listingsStrip')} href={href('/housing')} linkLabel={t('ellieo.seeAll')} />
      <ul className='-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {listings.map((listing) => {
          const [cover] = getListingImages(listing)
          return (
            <li key={listing.id} className='w-[13.5rem] shrink-0'>
              <Link href={hrefForHousingListing(listing)} className='group block rounded-[1.5rem] bg-white p-2 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'>
                <span className='relative block aspect-[4/3] overflow-hidden rounded-[1.125rem] bg-[var(--surface)]'>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- listing photo URL
                    <img src={cover} alt='' loading='lazy' className='size-full object-cover transition duration-300 group-hover:scale-[1.04]' />
                  ) : null}
                  <span className='absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-0.5 tabular-nums shadow-[0_2px_8px_-2px_rgb(20_18_31/0.25)] text-[13.5px] font-extrabold text-[var(--foreground)]'>
                    {format.usd(getHousingUnitRent(listing), 0)}
                    <span className='text-[11px] font-semibold'>{t('ellieo.perMonth')}</span>
                  </span>
                </span>
                <span className='block px-1.5 pb-1 pt-2'>
                  <span className='block truncate text-[14px] font-bold text-[var(--foreground)]'>{getListingArea(listing)}</span>
                  <span className='block truncate text-[12.5px] text-[var(--muted)]'>{formatListingBedBath(listing)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------- Community feed ---------- */

/** Housing and roommates/sublets have their own blocks, so the feed leaves them out */
const FEED_EXCLUDED_BOARDS: readonly NycCategoryId[] = ['housing', 'roommate']

/** Posts at or above this many likes get the Trending tag */
const TRENDING_LIKES = 40

function CommunityFeed() {
  const t = useT('hub')
  const tn = useT('nav')
  const locale = useLocale()
  const format = useFormat()
  const href = useCityPath()
  // Fixed at mount so "3 hours ago" doesn't change between renders
  const [now] = useState(() => Date.now())
  const feed = useHomeFeed(locale, now)
  const posts = feed.items.filter((post) => !FEED_EXCLUDED_BOARDS.includes(post.board))
  if (feed.loading) {
    return (
      <div className='flex justify-center py-16'>
        <EllieoDots />
      </div>
    )
  }

  const cards = posts.map((post) => {
    const board = ELLIEO_BOARDS.find((item) => item.id === post.board)
    const anonymous = post.board === 'anonymous'
    const name = anonymous ? t('ellieo.community.anonymous') : post.nickname || '?'
    return (
      <li key={post.id}>
        <EllieoFeedCard
          href={href(post.path ?? board?.path ?? '/')}
          avatar={<EllieoPersonAvatar name={name} anonymous={anonymous} />}
          name={name}
          verified={!anonymous}
          meta={[anonymous || !post.school ? null : shortSchool(post.school), format.relative(post.at)].filter(Boolean).join(' · ')}
          tag={<EllieoBoardTag boardId={post.board} label={tn(`ellieo.short.${post.board}`)} />}
          community={communityForBoard(post.board)}
          communityName={communityForBoard(post.board) ? tn(`ellieo.communities.${communityForBoard(post.board)!.key}.name`) : undefined}
          badge={
            post.likes >= TRENDING_LIKES ? (
              <span className='rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--brand-deep)]'>
                {t('ellieo.community.trending')}
              </span>
            ) : null
          }
          title={post.title}
          excerpt={post.excerpt}
          likes={post.likes}
          comments={post.comments}
        />
      </li>
    )
  })

  return (
    <section className='min-w-0'>
      {posts.length === 0 ? (
        <div className='mt-6'>
          <ExploreBoards />
        </div>
      ) : (
        <>
          {feed.sample ? (
            <div className='flex justify-end pt-2'>
              <SampleTag />
            </div>
          ) : null}
          <ul className='flex flex-col'>{cards.slice(0, 2)}</ul>
        </>
      )}
      <div className='mt-5 lg:hidden'>
        <ListingsStrip />
      </div>
      {posts.length > 2 ? <ul className='mt-3 flex flex-col border-t border-[var(--border)] lg:mt-0 lg:border-t-0'>{cards.slice(2)}</ul> : null}
      <div className='mt-8 lg:hidden'>
        <RoommatesRail />
      </div>
    </section>
  )
}

/* ---------- Home feed data: real posts first, design samples only on a dev server ---------- */

type HomeFeedItem = {
  id: string
  board: NycCategoryId
  /** Post detail path; samples link to their board */
  path: string | null
  title: string
  excerpt: string
  nickname: string
  school: string
  at: number
  likes: number
  comments: number
}

const HOME_FEED_LIMIT = 8

/**
 * Newest community posts of this city from /api/community (Ellieo only gets posts with an en/vi version,
 * src/lib/translations/localize.server.ts). Sample posts (mockContent) only when there are no real ones.
 */
function useHomeFeed(locale: string, now: number): { items: HomeFeedItem[]; sample: boolean; loading: boolean } {
  const city = useCity()
  const [real, setReal] = useState<HomeFeedItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/community?${new URLSearchParams({ city }).toString()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<{ posts?: CommunityPost[] }>) : { posts: [] }))
      .catch(() => ({ posts: [] as CommunityPost[] }))
      .then((data) => {
        if (cancelled) return
        const items: HomeFeedItem[] = []
        for (const post of data.posts ?? []) {
          const boardId = (resolveMergedCommunityBoardId(post.categoryId) ?? post.categoryId) as NycCategoryId
          const board = ELLIEO_BOARDS.find((item) => item.id === boardId)
          if (!board) continue
          items.push({
            id: post.id,
            board: boardId,
            path: `${board.path}/${encodeURIComponent(post.id)}`,
            title: post.title,
            excerpt: post.description,
            nickname: post.authorNickname || '',
            school: post.authorSchoolName || '',
            at: post.createdAt,
            likes: post.recommendCount,
            comments: post.commentCount,
          })
        }
        items.sort((a, b) => b.at - a.at)
        setReal(items.slice(0, HOME_FEED_LIMIT))
      })
    return () => {
      cancelled = true
    }
  }, [city, locale])

  if (real === null) return { items: [], sample: false, loading: true }
  if (real.length > 0) return { items: real, sample: false, loading: false }
  const samples = getCommunityHighlights().map((post) => ({
    id: post.id,
    board: post.board,
    path: null,
    title: locale === 'vi' ? post.title.vi : post.title.en,
    excerpt: locale === 'vi' ? post.excerpt.vi : post.excerpt.en,
    nickname: post.nickname,
    school: post.school,
    at: now - post.hoursAgo * 3_600_000,
    likes: post.likes,
    comments: post.comments,
  }))
  return { items: samples, sample: samples.length > 0, loading: false }
}
