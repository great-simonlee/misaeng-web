'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LoadingState, MarqueeRow } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { captureReferralFromLocation } from '@lib/community/referral'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_MAGAZINE_PREVIEWS } from '@lib/constants/nyc'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { EllieoHousingCard } from '@widgets/ellieo/EllieoHousingCard'
import { ArrowRightIcon, ChatIcon, ShieldCheckIcon } from '@widgets/ellieo/icons'
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
 * Ellieo city home. Content first: a one-line intro, then partner student associations and
 * creators, the newest housing and community posts, and the magazine. Board links are in the
 * header / bottom tab bar and the trust promises in the footer, so the home doesn't repeat them.
 * Copy: hub.ellieo.* (en + vi). Sample partners/posts: widgets/ellieo/mockContent.
 */
export function EllieoHomeScreen() {
  const t = useT('hub')
  const city = useCity()
  const cityInfo = useCityInfo()
  const { user, loading } = useAuth()

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  return (
    <div className='min-w-0 bg-[var(--background)]'>
      {/* Slim intro. Board links live in the header (desktop) and the bottom tab bar (mobile), so none here */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8'>
        <p className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ellieo-jade)]'>
          <ShieldCheckIcon className='size-4' />
          {t('ellieo.hero.eyebrow', { city: cityInfo.shortLabel })}
        </p>
        <h1 className='mt-1 text-[1.4rem] font-bold tracking-[-0.025em] text-[var(--foreground)] sm:text-[1.65rem]'>
          {t('ellieo.intro.title', { city: cityInfo.shortLabel })}
        </h1>
        {/* Desktop header already has Join; phones only get it here */}
        {!loading && !user ? (
          <Link
            href={`${cityLoginPath(city)}?mode=signup`}
            className='mt-3 inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[var(--brand)] px-4 text-[14.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)] lg:hidden'
          >
            {t('ellieo.hero.join')}
            <ArrowRightIcon className='size-4' />
          </Link>
        ) : null}
      </section>

      <PartnerOrgsSection />
      <CreatorsSection />
      <LatestHousingSection />
      <CommunitySection />

      {/* Magazine preview */}
      <section className='mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8'>
        <SectionHeading
          title={t('magazine.title')}
          body={t('magazine.description')}
          aside={
            <span className='rounded-md bg-[var(--ellieo-sun-soft)] px-2 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
              {t('comingSoon')}
            </span>
          }
        />
        <ul className='mt-4 grid gap-3 md:grid-cols-2'>
          {NYC_MAGAZINE_PREVIEWS.map((item) => (
            <li key={item.id} className='flex min-w-0 gap-3.5 rounded-xl bg-white p-3 ring-1 ring-[var(--border)]'>
              <span className='relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)] sm:w-28'>
                <Image src={item.image} alt='' fill loading='eager' className='object-cover' sizes='112px' />
              </span>
              <span className='min-w-0 py-0.5'>
                <span className='block text-[12px] font-semibold text-[var(--brand)]'>
                  {t(`magazine.items.${item.id}.tag`)}
                </span>
                <span className='mt-0.5 line-clamp-2 block text-[15px] font-semibold leading-snug text-[var(--foreground)]'>
                  {t(`magazine.items.${item.id}.title`)}
                </span>
                <span className='mt-1 line-clamp-2 block text-[13px] leading-relaxed text-[var(--muted)]'>
                  {t(`magazine.items.${item.id}.excerpt`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PartnerOrgsSection() {
  const t = useT('hub')
  const orgs = getPartnerOrgs()
  if (orgs.length === 0) return null

  return (
    <PeopleSection
      title={t('ellieo.vsa.title')}
      sample={isMockList(orgs, ELLIEO_PARTNER_ORGS)}
      items={orgs.map((org) => ({
        id: org.id,
        mark: org.mark,
        color: org.color,
        name: org.name,
        detail: org.school,
        url: org.instagram ? `https://instagram.com/${org.instagram}` : null,
      }))}
    />
  )
}

const PLATFORM_URL: Record<EllieoCreator['platform'], (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
}

function CreatorsSection() {
  const t = useT('hub')
  const format = useFormat()
  const creators = getCreators()
  if (creators.length === 0) return null

  return (
    <PeopleSection
      title={t('ellieo.creators.title')}
      sample={isMockList(creators, ELLIEO_CREATORS)}
      items={creators.map((creator) => ({
        id: creator.id,
        mark: creator.name.charAt(0),
        color: creator.color,
        name: creator.name,
        detail: `${t(`ellieo.creators.platforms.${creator.platform}`)} · ${format.number(creator.followers, {
          notation: 'compact',
          maximumFractionDigits: 1,
        })}`,
        url: creator.handle ? PLATFORM_URL[creator.platform](creator.handle) : null,
      }))}
    />
  )
}

type PersonItem = { id: string; mark: string; color: string; name: string; detail: string; url: string | null }

/** Partner VSAs and creators: compact entries (mark, name, one detail line) that slide across on their own */
function PeopleSection({ title, sample, items }: { title: string; sample: boolean; items: PersonItem[] }) {
  return (
    <section className='mx-auto w-full max-w-7xl pt-5 sm:pt-6'>
      <div className='px-4 sm:px-6 lg:px-8'>
        <SectionHeading size='sm' title={title} aside={sample ? <SampleTag /> : null} />
      </div>
      {/* Slides by itself; pauses on hover, stops for reduced motion (partner-marquee in globals.css) */}
      <MarqueeRow className='mt-2 lg:mx-8'>
        {items.map((item) => {
          const inner = (
            <>
              <span
                aria-hidden
                className='inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold tracking-tight text-white'
                style={{ background: item.color }}
              >
                {item.mark}
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-[14px] font-semibold text-[var(--foreground)]'>{item.name}</span>
                <span className='block truncate text-[12.5px] text-[var(--muted)]'>{item.detail}</span>
              </span>
            </>
          )
          const rowClass = 'flex w-[13.5rem] shrink-0 items-center gap-2.5 rounded-xl bg-white px-3 py-2 ring-1 ring-inset ring-[var(--border)]'
          return item.url ? (
            <a
              key={item.id}
              href={item.url}
              target='_blank'
              rel='noopener noreferrer'
              className={cn(rowClass, 'transition hover:ring-[var(--border-muted)]')}
            >
              {inner}
            </a>
          ) : (
            <div key={item.id} className={rowClass}>
              {inner}
            </div>
          )
        })}
      </MarqueeRow>
    </section>
  )
}
function LatestHousingSection() {
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
    <section className='mx-auto w-full max-w-7xl pt-8 sm:pt-10'>
      <div className='px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          title={t('ellieo.latestHousing.title')}
          body={t('ellieo.latestHousing.body')}
          aside={<SeeAll href={href('/housing')} label={t('ellieo.seeAll')} />}
        />
      </div>
      {listings === null ? (
        <LoadingState className='py-12' />
      ) : (
        <ScrollRow>
          {listings.map((listing) => (
            <li key={listing.id} className='w-[85%] max-w-[22rem] shrink-0 snap-start sm:w-[20rem] lg:w-auto lg:max-w-none'>
              <EllieoHousingCard listing={listing} />
            </li>
          ))}
        </ScrollRow>
      )}
    </section>
  )
}

function CommunitySection() {
  const t = useT('hub')
  const tc = useT('community')
  const locale = useLocale()
  const format = useFormat()
  const href = useCityPath()
  const posts = getCommunityHighlights()
  // Fixed at mount so "3 hours ago" doesn't change between renders
  const [now] = useState(() => Date.now())
  if (posts.length === 0) return null

  return (
    <section className='mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8'>
      <SectionHeading title={t('ellieo.community.title')} body={t('ellieo.community.body')} aside={<SampleTag />} />
      <ul className='mt-4 grid gap-2.5 md:grid-cols-2'>
        {posts.map((post) => {
          const board = ELLIEO_BOARDS.find((item) => item.id === post.board)
          return (
            <li key={post.id}>
              <Link
                href={href(board?.path ?? '/')}
                className='group flex h-full flex-col rounded-xl bg-white p-4 ring-1 ring-[var(--border)] transition hover:ring-[var(--border-muted)]'
              >
                <span className='flex items-center gap-2 text-[12px] font-semibold text-[var(--brand)]'>
                  {tc(`categories.${post.board}.title`)}
                  <span className='font-normal text-[var(--muted)]'>
                    · {format.relative(now - post.hoursAgo * 3_600_000)}
                  </span>
                </span>
                <span className='mt-1 line-clamp-2 text-[15.5px] font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                  {locale === 'vi' ? post.title.vi : post.title.en}
                </span>
                <span className='mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[var(--muted)]'>
                  {locale === 'vi' ? post.excerpt.vi : post.excerpt.en}
                </span>
                <span className='mt-auto flex items-center justify-between gap-2 pt-3 text-[12.5px] text-[var(--muted)]'>
                  <span className='inline-flex min-w-0 items-center gap-1'>
                    <ShieldCheckIcon className='size-3.5 shrink-0 text-[var(--ellieo-jade)]' />
                    <span className='truncate'>{post.school}</span>
                  </span>
                  <span className='inline-flex shrink-0 items-center gap-1'>
                    <ChatIcon className='size-3.5' />
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

/** Horizontal swipe row on phones/tablets, plain grid on desktop */
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className='mt-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden'>
      <ul className='flex snap-x snap-mandatory gap-3 px-4 sm:px-6 lg:grid lg:snap-none lg:grid-cols-4 lg:px-8'>
        {children}
      </ul>
    </div>
  )
}

function SectionHeading({
  title,
  body,
  aside,
  size = 'md',
}: {
  title: string
  body?: string
  aside?: React.ReactNode
  /** sm: the compact partner/creator rows */
  size?: 'sm' | 'md'
}) {
  return (
    <div className='min-w-0'>
      {/* aside (See all / Sample data) stays on the title line, even on phones */}
      <div className='flex items-center justify-between gap-3'>
        <h2
          className={cn(
            'min-w-0 font-bold tracking-[-0.02em] text-[var(--foreground)]',
            size === 'sm' ? 'text-[1.05rem] sm:text-[1.15rem]' : 'text-[1.2rem] sm:text-[1.35rem]',
          )}
        >
          {title}
        </h2>
        {aside ? <div className='shrink-0'>{aside}</div> : null}
      </div>
      {body ? <p className='mt-0.5 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]'>{body}</p> : null}
    </div>
  )
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className='inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--brand)] hover:underline'>
      {label}
      <ArrowRightIcon className='size-4' />
    </Link>
  )
}

/** Marks sample (mock) data during design review; mock data never ships to production */
function SampleTag() {
  const t = useT('hub')
  return (
    <span className='rounded-md bg-[var(--ellieo-sun-soft)] px-2 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
      {t('ellieo.sampleData')}
    </span>
  )
}
