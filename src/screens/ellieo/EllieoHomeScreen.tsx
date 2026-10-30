'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { captureReferralFromLocation } from '@lib/community/referral'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_MAGAZINE_PREVIEWS } from '@lib/constants/nyc'
import { fetchHousingListings } from '@lib/housing/fetchListings'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'
import { EllieoHousingCard } from '@widgets/ellieo/EllieoHousingCard'
import { ArrowRightIcon, ChatIcon, FlagIcon, ShieldCheckIcon } from '@widgets/ellieo/icons'
import {
  ELLIEO_CREATORS,
  ELLIEO_PARTNER_ORGS,
  getCommunityHighlights,
  getCreators,
  getPartnerOrgs,
  isMockList,
  type EllieoCreator,
  type EllieoPartnerOrg,
} from '@widgets/ellieo/mockContent'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

const HOUSING_PREVIEW_COUNT = 4

/**
 * Ellieo city home. Content first: a slim intro with board shortcuts, then partner student
 * associations and creators, the newest housing and community posts, and only then the boards
 * and the safety promise (the footer also carries the trust points).
 * Copy: hub.ellieo.* (en + vi). Sample partners/posts: widgets/ellieo/mockContent.
 */
export function EllieoHomeScreen() {
  const t = useT('hub')
  const tc = useT('community')
  const city = useCity()
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const { user, loading } = useAuth()
  const sla = BRAND_CONFIG.trust.reportSlaHours

  useEffect(() => {
    captureReferralFromLocation()
  }, [])

  return (
    <div className='min-w-0 bg-[var(--background)]'>
      {/* Slim intro: who this is for + board shortcuts */}
      <section className='border-b border-[var(--border)] bg-white'>
        <div className='mx-auto w-full max-w-7xl px-4 pb-5 pt-6 sm:px-6 sm:pt-8 lg:px-8'>
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div className='min-w-0'>
              <p className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ellieo-jade)]'>
                <ShieldCheckIcon className='size-4' />
                {t('ellieo.hero.eyebrow', { city: cityInfo.shortLabel })}
              </p>
              <h1 className='mt-1.5 text-[1.5rem] font-bold tracking-[-0.025em] text-[var(--foreground)] sm:text-[1.9rem]'>
                {t('ellieo.intro.title', { city: cityInfo.shortLabel })}
              </h1>
            </div>
            {!loading && !user ? (
              <Link
                href={`${cityLoginPath(city)}?mode=signup`}
                className='inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[var(--brand)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
              >
                {t('ellieo.hero.join')}
                <ArrowRightIcon className='size-4' />
              </Link>
            ) : null}
          </div>
          <nav aria-label={t('ellieo.boards.title')} className='-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
            <ul className='flex w-max gap-2 sm:w-auto sm:flex-wrap'>
              {ELLIEO_BOARDS.filter((board) => board.available).map((board) => {
                const Icon = board.icon
                return (
                  <li key={board.id}>
                    <Link
                      href={href(board.path)}
                      className='inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--background)] px-3.5 text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] hover:ring-[var(--brand-subtle)]'
                    >
                      <Icon className='size-[18px] text-[var(--brand)]' />
                      {tc(`categories.${board.id}.title`)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </section>

      <PartnerOrgsSection />
      <CreatorsSection />
      <LatestHousingSection />
      <CommunitySection />

      {/* Safety: short version, after the content */}
      <section className='mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8'>
        <div className='flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-[var(--border)] sm:flex-row sm:items-center sm:justify-between sm:p-6'>
          <div className='min-w-0'>
            <p className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ellieo-jade)]'>
              <ShieldCheckIcon className='size-4' />
              {t('ellieo.safety.kicker')}
            </p>
            <h2 className='mt-1 text-[1.15rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.3rem]'>
              {t('ellieo.safety.title')}
            </h2>
            <p className='mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]'>
              {t('ellieo.safety.steps.report.body')}
            </p>
          </div>
          {sla ? (
            <p className='inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-[var(--ellieo-jade-soft)] px-3.5 py-2.5 text-[14px] font-semibold text-[var(--ellieo-jade)]'>
              <FlagIcon className='size-[18px]' />
              {t('ellieo.hero.points.reports', { hours: sla })}
            </p>
          ) : null}
        </div>
      </section>

      {/* Magazine preview */}
      <section className='mx-auto w-full max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8'>
        <SectionHeading
          title={t('magazine.title')}
          body={t('magazine.description')}
          aside={
            <span className='rounded-md bg-[var(--ellieo-sun-soft)] px-2 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
              {t('comingSoon')}
            </span>
          }
        />
        <ul className='mt-5 grid gap-3 md:grid-cols-2'>
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
  const format = useFormat()
  const orgs = getPartnerOrgs()
  if (orgs.length === 0) return null

  return (
    <section className='mx-auto w-full max-w-7xl pt-8 sm:pt-10'>
      <div className='px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          title={t('ellieo.vsa.title')}
          body={t('ellieo.vsa.body')}
          aside={isMockList(orgs, ELLIEO_PARTNER_ORGS) ? <SampleTag /> : null}
        />
      </div>
      <ScrollRow five={orgs.length === 5}>
        {orgs.map((org) => (
          <li key={org.id} className='w-[15.5rem] shrink-0 snap-start lg:w-auto'>
            <PartnerOrgCard org={org} members={t('ellieo.vsa.members', { count: format.number(org.members) })} />
          </li>
        ))}
      </ScrollRow>
    </section>
  )
}

function PartnerOrgCard({ org, members }: { org: EllieoPartnerOrg; members: string }) {
  const t = useT('hub')
  return (
    <div className='flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-[var(--border)]'>
      <div className='flex items-center gap-3'>
        <span
          aria-hidden
          className='inline-flex size-12 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tracking-tight text-white'
          style={{ background: org.color }}
        >
          {org.mark}
        </span>
        <span className='rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--brand)]'>
          {t('ellieo.vsa.partnerBadge')}
        </span>
      </div>
      <p className='mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--foreground)]'>{org.name}</p>
      <p className='mt-1 text-[13px] text-[var(--muted)]'>{org.school}</p>
      <p className='mt-auto pt-3 text-[13px] font-medium text-[var(--muted-foreground)]'>
        {members}
        {org.instagram ? (
          <a
            href={`https://instagram.com/${org.instagram}`}
            target='_blank'
            rel='noopener noreferrer'
            className='ml-2 text-[var(--brand)] hover:underline'
          >
            @{org.instagram}
          </a>
        ) : null}
      </p>
    </div>
  )
}

const PLATFORM_URL: Record<EllieoCreator['platform'], (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
}

function CreatorsSection() {
  const t = useT('hub')
  const locale = useLocale()
  const format = useFormat()
  const creators = getCreators()
  if (creators.length === 0) return null

  return (
    <section className='mx-auto w-full max-w-7xl pt-8 sm:pt-10'>
      <div className='px-4 sm:px-6 lg:px-8'>
        <SectionHeading
          title={t('ellieo.creators.title')}
          body={t('ellieo.creators.body')}
          aside={isMockList(creators, ELLIEO_CREATORS) ? <SampleTag /> : null}
        />
      </div>
      <ScrollRow>
        {creators.map((creator) => {
          const inner = (
            <>
              <span
                aria-hidden
                className='inline-flex size-14 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-white ring-4 ring-white'
                style={{ background: creator.color }}
              >
                {creator.name.charAt(0)}
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-[15px] font-semibold text-[var(--foreground)]'>{creator.name}</span>
                <span className='mt-0.5 block text-[12.5px] font-medium text-[var(--muted)]'>
                  {t(`ellieo.creators.platforms.${creator.platform}`)} ·{' '}
                  {t('ellieo.creators.followers', {
                    count: format.number(creator.followers, { notation: 'compact', maximumFractionDigits: 1 }),
                  })}
                </span>
                <span className='mt-1.5 line-clamp-2 block text-[13.5px] leading-snug text-[var(--muted-foreground)]'>
                  {locale === 'vi' ? creator.topic.vi : creator.topic.en}
                </span>
              </span>
            </>
          )
          const cardClass = 'flex h-full items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-[var(--border)]'
          return (
            <li key={creator.id} className='w-[17rem] shrink-0 snap-start lg:w-auto'>
              {creator.handle ? (
                <a
                  href={PLATFORM_URL[creator.platform](creator.handle)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={cn(cardClass, 'transition hover:ring-[var(--border-muted)]')}
                >
                  {inner}
                </a>
              ) : (
                <div className={cardClass}>{inner}</div>
              )}
            </li>
          )
        })}
      </ScrollRow>
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
    <section className='mx-auto w-full max-w-7xl pt-10 sm:pt-14'>
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
  if (posts.length === 0) return null

  return (
    <section className='mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8'>
      <SectionHeading title={t('ellieo.community.title')} body={t('ellieo.community.body')} aside={<SampleTag />} />
      <ul className='mt-5 grid gap-2.5 md:grid-cols-2'>
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
                    · {format.relative(Date.now() - post.hoursAgo * 3_600_000)}
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
function ScrollRow({ children, five = false }: { children: React.ReactNode; five?: boolean }) {
  return (
    <div className='mt-4 overflow-x-auto pb-1 [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden'>
      <ul
        className={cn(
          'flex snap-x snap-mandatory gap-3 px-4 sm:px-6 lg:grid lg:snap-none lg:px-8',
          five ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
        )}
      >
        {children}
      </ul>
    </div>
  )
}

function SectionHeading({ title, body, aside }: { title: string; body?: string; aside?: React.ReactNode }) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-2'>
      <div className='min-w-0'>
        <h2 className='text-[1.25rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.45rem]'>{title}</h2>
        {body ? <p className='mt-1 max-w-2xl text-[14.5px] leading-relaxed text-[var(--muted)]'>{body}</p> : null}
      </div>
      {aside}
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
