'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BadgeCheckIcon, ChatIcon, HeartIcon } from '@widgets/ellieo/icons'

/** Open boards whose posts the rail mixes (housing/roommates have their own pages; events/marketplace aren't open yet) */
const RAIL_BOARDS: readonly NycCommunityBoardId[] = ['status', 'job-review', 'anonymous', 'food']
const RAIL_POST_COUNT = 5

type RailTab = 'latest' | 'liked' | 'discussed'

/** cpt-opt / visa / green-card posts live under the status board name */
function boardKey(categoryId: string): string {
  return categoryId === 'cpt-opt' || categoryId === 'visa' || categoryId === 'green-card' ? 'status' : categoryId
}

/**
 * Right rail on every Ellieo board page (tabs are underlined text, not pills, so long Vietnamese labels fit): my profile on top, then posts from all boards
 * as Latest / Most liked / Most discussed tabs. Same rail everywhere so pages feel like one site.
 */
export function EllieoBoardRail() {
  return (
    <aside className='flex min-w-0 flex-col gap-8'>
      <ProfileCard />
      <PopularPosts />
    </aside>
  )
}

function ProfileCard() {
  const t = useT('hub')
  const city = useCity()
  const href = useCityPath()
  const { user, profile, displayName, avatarURL, loading } = useAuth()

  if (loading) return <div className='h-[9.5rem] rounded-2xl border border-[var(--border)]' aria-hidden />

  if (!user) {
    return (
      <section className='rounded-2xl border border-[var(--border)] bg-[#f8f9fc] p-5'>
        <p className='text-[15px] font-bold text-[var(--foreground)]'>{t('ellieo.rail.guestTitle')}</p>
        <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>{t('ellieo.rail.guestBody')}</p>
        <div className='mt-4 flex gap-2'>
          <Link
            href={`${cityLoginPath(city)}?mode=signup`}
            className='inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[var(--brand)] text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
          >
            {t('ellieo.rail.join')}
          </Link>
          <Link
            href={cityLoginPath(city)}
            className='inline-flex h-9 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[13.5px] font-semibold text-[var(--foreground)] transition hover:border-[var(--border-muted)]'
          >
            {t('ellieo.rail.login')}
          </Link>
        </div>
      </section>
    )
  }

  const school = profile?.verifiedSchoolName ?? null
  const links = [
    { href: href('/me/posts'), label: t('ellieo.rail.myPosts') },
    { href: href('/me/likes'), label: t('ellieo.rail.myLikes') },
    { href: href('/me'), label: t('ellieo.rail.myPage') },
  ]

  return (
    <section className='rounded-2xl border border-[var(--border)] p-5'>
      <div className='flex items-center gap-3'>
        {avatarURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarURL} alt='' className='size-12 shrink-0 rounded-full object-cover' />
        ) : (
          <span
            aria-hidden
            className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1f5eff,#12b5cb)] text-[17px] font-bold uppercase text-white'
          >
            {displayName.charAt(0)}
          </span>
        )}
        <span className='min-w-0'>
          <span className='block truncate text-[15px] font-bold text-[var(--foreground)]'>{displayName}</span>
          <span className='mt-0.5 flex items-center gap-1 text-[12.5px] text-[var(--muted)]'>
            {school ? (
              <>
                <BadgeCheckIcon className='size-3.5 shrink-0 text-[var(--ellieo-jade)]' />
                <span className='truncate'>{school}</span>
              </>
            ) : (
              <Link href={href('/me')} className='font-semibold text-[var(--brand)] hover:underline'>
                {t('ellieo.rail.verify')}
              </Link>
            )}
          </span>
        </span>
      </div>
      <ul className='mt-4 grid grid-cols-3 gap-1.5'>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className='flex h-9 items-center justify-center rounded-full bg-[var(--surface)] text-[12.5px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]'
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function PopularPosts() {
  const t = useT('hub')
  const tc = useT('community')
  const format = useFormat()
  const city = useCity()
  const [tab, setTab] = useState<RailTab>('latest')
  const [posts, setPosts] = useState<CommunityPost[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // Straight from the API: fetchCommunityPosts falls back to Misaeng sample posts when a board is empty
    const load = async (board: NycCommunityBoardId): Promise<CommunityPost[]> => {
      try {
        const res = await fetch(`/api/community?${new URLSearchParams({ board, city }).toString()}`, { cache: 'no-store' })
        if (!res.ok) return []
        const data = (await res.json()) as { posts?: CommunityPost[] }
        return Array.isArray(data.posts) ? data.posts : []
      } catch {
        return []
      }
    }
    void Promise.all(RAIL_BOARDS.map(load)).then((lists) => {
      if (cancelled) return
      // Shared boards can come back from more than one request: keep each post once
      const byId = new Map<string, CommunityPost>()
      for (const post of lists.flat()) byId.set(post.id, post)
      setPosts([...byId.values()])
    })
    return () => {
      cancelled = true
    }
  }, [city])

  const shown = useMemo(() => {
    if (!posts) return []
    const sorted = [...posts].sort((a, b) => {
      if (tab === 'liked') return b.recommendCount - a.recommendCount || b.createdAt - a.createdAt
      if (tab === 'discussed') return b.commentCount - a.commentCount || b.createdAt - a.createdAt
      return b.createdAt - a.createdAt
    })
    return sorted.slice(0, RAIL_POST_COUNT)
  }, [posts, tab])

  const tabs: { id: RailTab; label: string }[] = [
    { id: 'latest', label: t('ellieo.rail.latest') },
    { id: 'liked', label: t('ellieo.rail.liked') },
    { id: 'discussed', label: t('ellieo.rail.discussed') },
  ]

  return (
    <section className='min-w-0'>
      <h2 className='text-[1.1rem] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>
        {t('ellieo.rail.postsTitle')}
      </h2>
      <div role='tablist' aria-label={t('ellieo.rail.postsTitle')} className='mt-2 flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--border)]'>
        {tabs.map((item) => (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 pb-2 pt-1 text-[13.5px] font-semibold transition',
              tab === item.id
                ? 'border-[var(--foreground)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {posts === null ? (
        <LoadingState className='py-10' />
      ) : shown.length === 0 ? (
        <p className='py-6 text-[13px] text-[var(--muted)]'>{t('ellieo.rail.empty')}</p>
      ) : (
        <ol className='mt-2'>
          {shown.map((post, index) => (
            <li key={post.id} className='border-b border-[var(--border)] last:border-b-0'>
              <Link href={hrefForCommunityPost(post, city)} data-ui='hover-row' className='group flex gap-3 py-3'>
                <span
                  className={cn(
                    'w-4 shrink-0 pt-px text-[14px] font-extrabold tabular-nums',
                    index < 3 ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
                  )}
                >
                  {index + 1}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand)]'>
                    {post.title}
                  </span>
                  <span className='mt-1 flex items-center gap-2.5 text-[12px] text-[var(--muted)]'>
                    <span className='truncate'>{tc(`categories.${boardKey(post.categoryId)}.title`)}</span>
                    <span className='inline-flex shrink-0 items-center gap-1'>
                      <HeartIcon className='size-3.5' />
                      {format.number(post.recommendCount)}
                    </span>
                    <span className='inline-flex shrink-0 items-center gap-1'>
                      <ChatIcon className='size-3.5' />
                      {format.number(post.commentCount)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
