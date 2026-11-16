'use client'

import {
  BagIcon,
  BellIcon,
  BookIcon,
  BowlIcon,
  BriefcaseIcon,
  BuildingIcon,
  ChatIcon,
  HomeIcon,
  PencilIcon,
  PlaneIcon,
  UsersIcon,
} from '@widgets/ellieo/icons'
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
  ELLIEO_CREATORS,
  ELLIEO_PARTNER_ORGS,
  getCommunityHighlights,
  getCreators,
  getPartnerOrgs,
  isMockList,
  type EllieoCreator,
} from '@widgets/ellieo/mockContent'
import { EllieoSideRail, FeedHeading, RoommatesRail, SampleTag, shortSchool } from '@widgets/ellieo/EllieoRail'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

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
    // flex-1: fill the layout's main column above the footer
    <div className='min-w-0 flex-1 bg-white'>
      <h1 className='sr-only'>{t('ellieo.intro.title', { city: cityInfo.shortLabel })}</h1>
      {/* One 640px feed column; the side rail (new listings, roommates) joins it from 1280px */}
      <div className='mx-auto grid w-full max-w-[40rem] gap-8 px-4 pb-4 pt-4 xl:max-w-[63rem] xl:grid-cols-[minmax(0,40rem)_20rem] xl:justify-center'>
        <div className='min-w-0'>
          <HomeHero />
          <StoriesStrip />
          <CommunityFeed />
        </div>
        <div className='hidden xl:block'>
          <div className='sticky top-24'>
            <EllieoSideRail />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Top card: sign-up prompt for visitors, welcome card for members ---------- */

function HomeHero() {
  const { user, loading } = useEllieoViewer()
  // Quick links always on top; visitors also get the sign-up card under them (members: no welcome banner)
  return (
    <>
      <QuickNav />
      {!loading && !user ? (
        <div className='mt-4'>
          <GuestHero />
        </div>
      ) : null}
    </>
  )
}

/* ---------- Quick links: every board / sub-tab one tap away (user 11-16) ---------- */

const QUICK_NAV = [
  { key: 'rent', path: '/housing', icon: HomeIcon },
  { key: 'roommates', path: '/roommate', icon: UsersIcon },
  { key: 'visa', path: '/status', icon: PlaneIcon },
  { key: 'interviews', path: '/job-review', icon: BookIcon },
  { key: 'companies', path: '/companies', icon: BuildingIcon },
  { key: 'postings', path: '/companies/postings', icon: BriefcaseIcon },
  { key: 'food', path: '/food', icon: BowlIcon },
  { key: 'market', path: '/marketplace', icon: BagIcon },
  { key: 'ask', path: '/anonymous', icon: ChatIcon },
] as const

/**
 * Shortcuts, as plain as possible (user 11-16): 3×3 on phones, one row of 9 from 640px; blue line icon over a
 * centered 13px label (Vietnamese may wrap to 2 lines), no cell background, card or dividers.
 */
function QuickNav() {
  const t = useT('hub')
  const href = useCityPath()
  return (
    <nav aria-label={t('ellieo.quickNav.aria')}>
      <ul className='grid grid-cols-3 gap-1 sm:grid-cols-9 sm:gap-0.5'>
        {QUICK_NAV.map((item) => (
          <li key={item.key}>
            <Link
              href={href(item.path)}
              className='flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center transition hover:bg-[var(--surface)] sm:px-0'
            >
              <item.icon className='size-[22px] shrink-0 text-[var(--brand)]' />
              <span className='text-[13px] font-medium leading-[1.25] text-[var(--foreground)] sm:tracking-[-0.02em]'>{t(`ellieo.quickNav.${item.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Logged-out: who you join, what you can do, one white sign-up button, log in under it (user 11-16) */
function GuestHero() {
  const t = useT('hub')
  const city = useCity()
  const cityInfo = useCityInfo()
  const benefits = [
    { icon: ChatIcon, label: t('ellieo.guestHero.benefitContact') },
    { icon: PencilIcon, label: t('ellieo.guestHero.benefitPost') },
    { icon: BellIcon, label: t('ellieo.guestHero.benefitSave') },
  ]

  return (
    <section className='relative overflow-hidden rounded-[1.5rem] bg-[var(--brand)] px-5 pb-5 pt-6 text-white sm:px-7 sm:pb-6 sm:pt-7'>
      <span aria-hidden className='absolute -right-10 -top-12 size-40 rounded-full bg-white/[0.08]' />
      <span aria-hidden className='absolute -right-2 top-16 size-16 rounded-full bg-white/[0.06]' />
      <h2 className='relative max-w-[30rem] text-[24px] font-extrabold leading-[1.2] tracking-[-0.03em] sm:text-[28px]'>
        {t('ellieo.guestHero.title', { city: cityInfo.name })}
      </h2>
      <ul className='relative mt-4 grid gap-2.5'>
        {benefits.map(({ icon: Icon, label }) => (
          <li key={label} className='flex items-center gap-3 text-[15px] font-semibold'>
            <span aria-hidden className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15'>
              <Icon className='size-[17px]' />
            </span>
            {label}
          </li>
        ))}
      </ul>
      <Link
        href={`${cityLoginPath(city)}?mode=signup`}
        className='relative mt-5 flex h-12 w-full items-center justify-center rounded-full bg-white px-7 text-[16px] font-bold text-[var(--brand)] transition hover:bg-white/90 sm:inline-flex sm:w-auto'
      >
        {t('ellieo.guestHero.signup')}
      </Link>
      <p className='relative mt-3 text-center text-[13.5px] text-white/80 sm:text-left'>
        {t('ellieo.guestHero.haveAccount')}{' '}
        <Link href={cityLoginPath(city)} className='font-bold text-white underline-offset-2 hover:underline'>
          {t('ellieo.guestHero.login')}
        </Link>
      </p>
    </section>
  )
}

/* ---------- Stories: partner VSAs + creators ---------- */

type Story = {
  id: string
  mark: string
  color: string
  name: string
  caption: string
  url: string | null
  ring: string
}

const PLATFORM_URL: Record<EllieoCreator['platform'], (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
}

/** Partners get a blue ring, creators a warm one, so the two kinds read apart at a glance */
const PARTNER_RING = 'linear-gradient(135deg, #3d7bff, #143fb0)'
const CREATOR_RING = 'linear-gradient(135deg, #1f5eff, #e0579b)'

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
      caption: `${t(`ellieo.creators.platforms.${creator.platform}`)} ${format.number(
        creator.followers,
        {
          notation: 'compact',
          maximumFractionDigits: 1,
        }
      )}`,
      url: creator.handle ? PLATFORM_URL[creator.platform](creator.handle) : null,
      ring: CREATOR_RING,
    })),
  ]
  if (stories.length === 0) return null
  const sample = isMockList(orgs, ELLIEO_PARTNER_ORGS) || isMockList(creators, ELLIEO_CREATORS)

  return (
    <section className='pt-5'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-[15px] font-extrabold tracking-[-0.01em] text-[var(--foreground)]'>
          {t('ellieo.stories.title')}
        </h2>
        <div className='flex shrink-0 items-center gap-2'>
          {sample ? <SampleTag /> : null}
          <Link
            href={href('/partners')}
            className='text-[13px] font-semibold text-[var(--foreground)] hover:text-[var(--brand)]'
          >
            {t('ellieo.seeAll')}
          </Link>
        </div>
      </div>
      <div className='-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {stories.map((story) => {
          const inner = (
            <>
              <span className='rounded-full p-[3px]' style={{ background: story.ring }}>
                <span className='block rounded-full bg-white p-[2px]'>
                  <span
                    aria-hidden
                    className='flex size-14 items-center justify-center rounded-full text-[13px] font-bold tracking-tight text-white'
                    style={{ background: story.color }}
                  >
                    {story.mark}
                  </span>
                </span>
              </span>
              <span className='mt-1 block w-full truncate text-center text-[12px] font-semibold leading-tight text-[var(--foreground)]'>
                {story.name}
              </span>
              <span className='block w-full truncate text-center text-[10px] leading-tight text-[var(--muted)]'>
                {story.caption}
              </span>
            </>
          )
          const itemClass = 'flex w-[4.75rem] shrink-0 flex-col items-center gap-0.5 py-0.5'
          return story.url ? (
            <a
              key={story.id}
              href={story.url}
              target='_blank'
              rel='noopener noreferrer'
              className={itemClass}
            >
              {inner}
            </a>
          ) : (
            <div key={story.id} className={itemClass}>
              {inner}
            </div>
          )
        })}
      </div>
    </section>
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

/* ---------- Board shortcuts: the boards that aren't in the bottom tab bar (no chip row on Home) ---------- */

const TAB_BAR_BOARDS: NycCategoryId[] = ['housing', 'food', 'marketplace', 'status', 'job-review', 'anonymous']

function BoardShortcuts() {
  const tn = useT('nav')
  const href = useCityPath()
  const boards = ELLIEO_BOARDS.filter((board) => board.available && !TAB_BAR_BOARDS.includes(board.id))
  // A row of one shortcut (only Roommates outside the tab bar) isn't worth it
  if (boards.length < 2) return null

  return (
    <nav aria-label={tn('ellieo.boardsAria')} className='-mx-4 mt-3'>
      <ul className='flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {boards.map((board) => (
          <li key={board.id} className='w-[4.75rem] shrink-0'>
            <Link href={href(board.path)} className='group flex flex-col items-center gap-1.5 rounded-2xl py-1.5'>
              <span className='inline-flex size-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:bg-[var(--brand-subtle)]'>
                <board.icon className='size-[22px]' />
              </span>
              <span className='max-w-full truncate text-center text-[12.5px] font-semibold text-[var(--foreground)]'>
                {tn(`ellieo.short.${board.id}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

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
    <section className='mt-7 min-w-0'>
      {posts.length === 0 ? (
        <ExploreBoards />
      ) : (
        <>
          <FeedHeading title={t('ellieo.community.title')} aside={feed.sample ? <SampleTag /> : null} />
          <BoardShortcuts />
          <ul className='mt-3 flex flex-col gap-3'>{cards.slice(0, 2)}</ul>
        </>
      )}
      <div className='mt-7'>
        <ListingsStrip />
      </div>
      {posts.length > 2 ? <ul className='mt-7 flex flex-col gap-3 xl:mt-3'>{cards.slice(2)}</ul> : null}
      <div className='mt-8 xl:hidden'>
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
