'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { fetchCommunityPage } from '@lib/community/client'
import { cityLoginPath, hrefForCommunityPost, hrefForHousingListing } from '@lib/constants/cities'
import { getHousingUnitRent, getListingArea, getListingDisplayAddress, getListingImages } from '@lib/constants/housingMock'
import { fetchPostings, type PublicPosting } from '@lib/company/postings'
import { fetchHousingPage } from '@lib/housing/fetchListings'
import { useT } from '@lib/i18n/client'
import type { CommunityPost, HousingListing } from '@/types/nyc'
import { CompanyLogo } from '@widgets/nyc/CompanyLogo'
import { useCommunityFormat } from '@widgets/nyc/CommunityPostCard'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'
import { MarketPostCard } from '@widgets/nyc/MarketListing'

/**
 * Hub home feed (owner 11-23 redesign): balanced sections at the navbar width —
 * 면접·취업 후기 + 새 채용 공고 as two equal list cards, a slim Premium launch strip, then photo rows for 하우징,
 * 중고거래 and 맛집. A section with no data is left out (no empty boxes). Misaeng hub only (NycHubScreen gates it).
 */

const CARD = 'rounded-[1.5rem] bg-white ring-1 ring-[var(--card-ring)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
/** Phones: a horizontal snap row; sm+: a grid */
const PHOTO_ROW_BASE =
  '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden'
/** Home photo rows: always 4 columns on desktop (owner 11-23) */
const photoRow = () =>
  cn(PHOTO_ROW_BASE, 'lg:grid-cols-4')
const PHOTO_ITEM = 'w-[78%] shrink-0 snap-start sm:w-auto'

export function HubLiveSections() {
  const city = useCity()
  const href = useCityPath()
  const t = useT('hub')
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<CommunityPost[] | null>(null)
  const [postings, setPostings] = useState<PublicPosting[] | null>(null)
  const [housing, setHousing] = useState<HousingListing[] | null>(null)
  const [market, setMarket] = useState<CommunityPost[] | null>(null)
  const [food, setFood] = useState<CommunityPost[] | null>(null)

  useEffect(() => {
    let alive = true
    const set = <T,>(setter: (v: T) => void) => (v: T) => alive && setter(v)
    // 면접·취업 후기는 회원 전용 게시판 (MemberGate): 로그인한 사람에게만 미리보기
    if (user)
      void fetchCommunityPage({ boardId: 'job-review', city, limit: 3 })
        .then((page) => set(setReviews)(page.posts))
        .catch(() => set(setReviews)([]))
    void fetchPostings(city)
      .then((list) => set(setPostings)([...list].sort((a, b) => b.postedAt - a.postedAt).slice(0, 5)))
      .catch(() => set(setPostings)([]))
    void fetchHousingPage({ city, limit: 4, filter: {} })
      .then((page) => set(setHousing)(page.listings))
      .catch(() => set(setHousing)([]))
    void fetchCommunityPage({ boardId: 'marketplace', city, limit: 4 })
      .then((page) => set(setMarket)(page.posts))
      .catch(() => set(setMarket)([]))
    void fetchCommunityPage({ boardId: 'food', city, limit: 4 })
      .then((page) => set(setFood)(page.posts.filter((post) => post.thumbnailUrl || post.galleryPhotos?.length)))
      .catch(() => set(setFood)([]))
    return () => {
      alive = false
    }
  }, [city, user])

  const guest = !authLoading && !user
  const showReviews = guest || reviews == null || reviews.length > 0
  const showPostings = postings == null || postings.length > 0

  return (
    <div className='space-y-14'>
      {showReviews || showPostings ? (
        <div className={cn('grid gap-6', showReviews && showPostings && 'lg:grid-cols-2')}>
          {showReviews ? (
            <Section kicker={t('live.kickerCareer')} title={t('live.jobReviews')} more={href('/job-review')} moreLabel={t('live.seeAll')}>
              {guest ? (
                <LockedReviews loginHref={cityLoginPath(city, href('/job-review'))} />
              ) : reviews == null ? (
                <ListSkeleton rows={3} />
              ) : (
                <ul className={cn(CARD, 'divide-y divide-black/[0.05] overflow-hidden')}>
                  {reviews.map((post) => (
                    <ReviewRow key={post.id} post={post} />
                  ))}
                </ul>
              )}
            </Section>
          ) : null}
          {showPostings ? (
            <Section kicker={t('live.kickerJobs')} title={t('live.postings')} more={href('/companies/postings')} moreLabel={t('live.seeAll')}>
              {postings == null ? (
                <ListSkeleton rows={5} />
              ) : (
                <ul className={cn(CARD, 'divide-y divide-black/[0.05] overflow-hidden')}>
                  {postings.map((posting) => (
                    <PostingRow key={posting.id} posting={posting} />
                  ))}
                </ul>
              )}
            </Section>
          ) : null}
        </div>
      ) : null}

      <LaunchStrip />

      {housing == null || housing.length > 0 ? (
        <Section kicker={t('live.kickerHousing')} title={t('live.housingTitle')} more={href('/housing')} moreLabel={t('live.seeAll')}>
          {housing == null ? (
            <PhotoSkeleton />
          ) : (
            <div className={photoRow()}>
              {housing.map((listing) => (
                <div key={listing.id} className={PHOTO_ITEM}>
                  <HousingTile listing={listing} />
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {market == null || market.length > 0 ? (
        <Section kicker={t('live.kickerMarket')} title={t('live.market')} more={href('/marketplace')} moreLabel={t('live.seeAll')}>
          {market == null ? (
            <PhotoSkeleton />
          ) : (
            <div className={photoRow()}>
              {market.map((post) => (
                <div key={post.id} className={PHOTO_ITEM}>
                  <MarketPostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {food && food.length > 0 ? (
        <Section kicker={t('live.kickerFood')} title={t('live.food')} more={href('/food')} moreLabel={t('live.seeAll')}>
          <div className={photoRow()}>
            {food.map((post) => (
              <div key={post.id} className={PHOTO_ITEM}>
                <FoodTile post={post} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}

function Section({ kicker, title, more, moreLabel, children }: { kicker: string; title: string; more: string; moreLabel: string; children: ReactNode }) {
  return (
    <section className='flex min-w-0 flex-col'>
      <div className='mb-4 flex items-end justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-[12px] font-extrabold tracking-[0.14em] text-[var(--brand)]'>{kicker}</p>
          <h2 className='mt-1 truncate text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.5rem]'>{title}</h2>
        </div>
        <Link
          href={more}
          className='inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#f4f5f7] px-3.5 text-[13px] font-semibold text-[var(--foreground)] transition hover:bg-[#eceef1]'
        >
          {moreLabel}
          <span aria-hidden>›</span>
        </Link>
      </div>
      <div className='flex-1'>{children}</div>
    </section>
  )
}

function ReviewRow({ post }: { post: CommunityPost }) {
  const city = useCity()
  const t = useT('hub')
  const format = useCommunityFormat()
  const company = post.location?.trim() || ''
  return (
    <li>
      <Link href={hrefForCommunityPost(post, city)} className='flex gap-3.5 px-5 py-4 transition hover:bg-[#fafbfc]'>
        <CompanyLogo name={company || post.title} logoUrl={null} className='size-11 text-[15px]' />
        <div className='min-w-0 flex-1'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <span className='truncate text-[13px] font-semibold text-[var(--muted-foreground)]'>{company}</span>
            <JobReviewTypeBadge type={post.jobReviewType} />
          </div>
          <p className='mt-0.5 truncate text-[15px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{post.title}</p>
          {post.description ? <p className='mt-0.5 truncate text-[13px] text-[var(--muted)]'>{post.description}</p> : null}
          <p className='mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]'>
            <span className='truncate font-medium text-[var(--muted-foreground)]'>{post.authorNickname || ''}</span>
            {post.authorNickname ? <span aria-hidden>·</span> : null}
            <span>{format.relativeTime(post.createdAt)}</span>
            <span aria-hidden>·</span>
            <span>{t('live.views', { count: format.count(post.viewCount) })}</span>
          </p>
        </div>
      </Link>
    </li>
  )
}

function PostingRow({ posting }: { posting: PublicPosting }) {
  const href = useCityPath()
  const format = useCommunityFormat()
  const where = posting.summary?.location || posting.regions?.[0] || ''
  return (
    <li>
      <Link href={href(`/companies/postings/${posting.id}`)} className='flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-[#fafbfc]'>
        <CompanyLogo name={posting.company.name} logoUrl={posting.company.logoUrl} className='size-10 text-[14px]' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-[14.5px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{posting.title}</p>
          <p className='mt-0.5 truncate text-[12.5px] text-[var(--muted)]'>
            <span className='font-semibold text-[var(--muted-foreground)]'>{posting.company.name}</span>
            {where ? ` · ${where}` : ''}
          </p>
        </div>
        <span className='shrink-0 text-[12px] text-[var(--muted)]'>{format.relativeTime(posting.postedAt)}</span>
      </Link>
    </li>
  )
}

function LockedReviews({ loginHref }: { loginHref: string }) {
  const t = useT('hub')
  return (
    <div className={cn(CARD, 'relative flex min-h-[16rem] flex-col items-center justify-center overflow-hidden px-6 py-10 text-center')}>
      {/* blurred hint of the list behind */}
      <div aria-hidden className='pointer-events-none absolute inset-0 flex flex-col gap-3 p-5 opacity-60 blur-[3px]'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='flex gap-3'>
            <span className='size-11 rounded-xl bg-[#eef0f3]' />
            <span className='flex-1 space-y-2 pt-1'>
              <span className='block h-3 w-1/3 rounded bg-[#eef0f3]' />
              <span className='block h-3.5 w-3/4 rounded bg-[#e6e8ec]' />
              <span className='block h-3 w-1/2 rounded bg-[#eef0f3]' />
            </span>
          </div>
        ))}
      </div>
      <div className='relative flex flex-col items-center'>
        <span className='flex size-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)]' aria-hidden>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-5'>
            <rect x='5' y='11' width='14' height='9' rx='2' />
            <path d='M8 11V8a4 4 0 0 1 8 0v3' />
          </svg>
        </span>
        <p className='mt-4 text-[17px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('live.reviewsLockedTitle')}</p>
        <p className='mt-1.5 max-w-xs break-keep text-[14px] text-[var(--muted-foreground)]'>{t('live.reviewsLogin')}</p>
        <Link
          href={loginHref}
          className='mt-5 inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-[14px] font-semibold text-white transition hover:bg-black'
        >
          {t('live.login')}
        </Link>
      </div>
    </div>
  )
}

function LaunchStrip() {
  const t = useT('hub')
  const href = useCityPath()
  return (
    <Link
      href={href('/premium')}
      className='group flex flex-col gap-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(110deg,#F64310_0%,#FF7A3D_55%,#FFA06B_100%)] px-6 py-5 text-white shadow-[0_18px_40px_-24px_rgba(246,67,16,0.8)] transition hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 sm:flex-row sm:items-center sm:px-8'
    >
      <div className='flex min-w-0 flex-1 items-center gap-4'>
        <span className='hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 sm:flex' aria-hidden>
          <svg viewBox='0 0 24 24' fill='currentColor' className='size-6'>
            <path d='M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5z' />
          </svg>
        </span>
        <div className='min-w-0'>
          <span className='inline-flex rounded-full bg-white/25 px-2.5 py-0.5 text-[11.5px] font-extrabold tracking-wide'>{t('live.launchBadge')}</span>
          <p className='mt-1.5 break-keep text-[18px] font-extrabold tracking-[-0.02em] sm:text-[20px]'>{t('live.launchTitle')}</p>
          <p className='mt-0.5 break-keep text-[13.5px] text-white/85'>{t('live.launchBody')}</p>
        </div>
      </div>
      <span className='inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-6 text-[14px] font-bold text-[var(--brand)] transition group-hover:bg-[#FFF4EE]'>
        {t('live.launchCta')}
      </span>
    </Link>
  )
}

function HousingTile({ listing }: { listing: HousingListing }) {
  const photo = getListingImages(listing)[0]
  const rent = getHousingUnitRent(listing)
  const area = getListingArea(listing)
  const address = getListingDisplayAddress(listing)
  return (
    <Link href={hrefForHousingListing(listing)} className={cn(CARD, 'group block overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.25)]')}>
      <div className='aspect-[4/3] overflow-hidden bg-[#f1f2f4]'>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing photo (remote, varied hosts)
          <img src={photo} alt='' loading='lazy' className='size-full object-cover transition duration-500 group-hover:scale-[1.03]' />
        ) : null}
      </div>
      <div className='px-4 pb-4 pt-3'>
        <p className='truncate text-[14.5px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{address}</p>
        <p className='mt-0.5 truncate text-[12.5px] text-[var(--muted)]'>{area}</p>
        {rent ? <p className='mt-1.5 text-[16px] font-extrabold tracking-tight text-[var(--foreground)]'>${rent.toLocaleString('en-US')}</p> : null}
      </div>
    </Link>
  )
}

function FoodTile({ post }: { post: CommunityPost }) {
  const city = useCity()
  const photo = post.galleryPhotos?.[0]?.imageUrl || post.thumbnailUrl || ''
  return (
    <Link href={hrefForCommunityPost(post, city)} className={cn(CARD, 'group block overflow-hidden transition duration-300 hover:-translate-y-0.5')}>
      <div className='aspect-[4/3] overflow-hidden bg-[#f1f2f4]'>
        {/* eslint-disable-next-line @next/next/no-img-element -- user photo */}
        <img src={photo} alt='' loading='lazy' className='size-full object-cover transition duration-500 group-hover:scale-[1.03]' />
      </div>
      <div className='px-4 pb-4 pt-3'>
        <p className='truncate text-[14.5px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{post.placeName || post.title}</p>
        <p className='mt-0.5 truncate text-[12.5px] text-[var(--muted)]'>{post.title}</p>
      </div>
    </Link>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className={cn(CARD, 'divide-y divide-black/[0.05]')} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className='flex gap-3.5 px-5 py-4'>
          <span className='size-11 animate-pulse rounded-xl bg-[#f1f2f4]' />
          <span className='flex-1 space-y-2 pt-1'>
            <span className='block h-3 w-1/3 animate-pulse rounded bg-[#f1f2f4]' />
            <span className='block h-3.5 w-2/3 animate-pulse rounded bg-[#f1f2f4]' />
          </span>
        </div>
      ))}
    </div>
  )
}

function PhotoSkeleton() {
  return (
    <div className={photoRow()} aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={cn(PHOTO_ITEM, CARD, 'overflow-hidden')}>
          <div className='aspect-[4/3] animate-pulse bg-[#f1f2f4]' />
          <div className='space-y-2 px-4 py-4'>
            <span className='block h-3.5 w-2/3 animate-pulse rounded bg-[#f1f2f4]' />
            <span className='block h-3 w-1/2 animate-pulse rounded bg-[#f1f2f4]' />
          </div>
        </div>
      ))}
    </div>
  )
}
