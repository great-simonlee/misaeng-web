'use client'

import Link from 'next/link'
import { createElement, useState, type ReactNode } from 'react'

import { useFormat, useT } from '@lib/i18n/client'
import { BadgeCheckIcon, ChatIcon, EyeIcon } from '@widgets/ellieo/icons'
import type { EllieoCommunity } from '@widgets/ellieo/communities'
import { boardIcon } from '@widgets/ellieo/nav'

/** Avatar fills when there is no photo: soft tints, ink-friendly */
const AVATAR_FILLS = ['#1f5eff', '#16b47e', '#e8861a', '#e0579b', '#2a9fd6', '#14121f']

function fillFor(text: string): string {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_FILLS[hash % AVATAR_FILLS.length]
}

/** Person-first avatar: photo when it loads, otherwise a colored initial; anonymous = chat icon on blue-soft */
export function EllieoPersonAvatar({
  photo,
  name,
  anonymous = false,
  size = 40,
}: {
  photo?: string | null
  name: string
  anonymous?: boolean
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (anonymous) {
    return (
      <span aria-hidden style={style} className='flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]'>
        <ChatIcon className='size-5' />
      </span>
    )
  }
  if (photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external profile URL
      <img src={photo} alt='' style={style} onError={() => setFailed(true)} className='shrink-0 rounded-full object-cover' />
    )
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: fillFor(name), fontSize: Math.round(size * 0.4) }}
      className='flex shrink-0 items-center justify-center rounded-full font-bold uppercase text-white'
    >
      {name.trim().charAt(0) || '?'}
    </span>
  )
}

/** Board tag (right of the author row): line icon + label */
export function EllieoBoardTag({ boardId, label }: { boardId: string; label: string }) {
  return (
    <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--foreground)]'>
      {createElement(boardIcon(boardId), { className: 'size-4 shrink-0' })}
      <span className='hidden min-[420px]:inline'>{label}</span>
    </span>
  )
}

/**
 * Ellieo board row (docs/design/ellieo-classifieds.md v4): line 1 = [category tag] title + blue [comment count];
 * line 2 = nickname · verified + school · time · views; optional 56px thumbnail on the right. Hairline between
 * rows. `extra` (e.g. visa step summary) sits under line 2. Like/save live on the detail page.
 */
export function EllieoFeedCard({
  href,
  name,
  verified,
  meta,
  community,
  title,
  badge,
  extra,
  photo,
  comments,
  views,
  viewsLabel,
}: {
  href: string
  avatar?: ReactNode
  name: string
  verified?: boolean
  meta?: string
  tag?: ReactNode
  community?: EllieoCommunity | null
  communityName?: string
  title: string
  badge?: ReactNode
  excerpt?: string
  extra?: ReactNode
  photo?: string | null
  likes?: number
  comments?: number
  views?: number
  viewsLabel?: string
  action?: ReactNode
}) {
  const format = useFormat()
  const t = useT('nav')
  return (
    <article className='relative border-b border-[var(--border)] bg-white'>
      <Link href={href} className='flex items-start gap-3 py-3'>
        <span className='min-w-0 flex-1'>
          <span className='flex min-w-0 items-center gap-1.5'>
            {community ? (
              <span className='shrink-0 rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--brand)]'>
                {t(`ellieo.cat.${community.key}`)}
              </span>
            ) : null}
            <span className='min-w-0 truncate text-[15px] font-medium text-[var(--foreground)]'>{title}</span>
            {comments ? (
              <span className='shrink-0 text-[13px] font-semibold tabular-nums text-[var(--brand)]'>[{format.number(comments)}]</span>
            ) : null}
          </span>
          {badge ? <span className='mt-1 flex flex-wrap gap-1'>{badge}</span> : null}
          <span className='mt-1 flex min-w-0 items-center gap-1 text-[12px] text-[var(--muted)]'>
            <span className='truncate'>{name}</span>
            {verified ? <BadgeCheckIcon className='size-3.5 shrink-0 text-[var(--brand)]' /> : null}
            {meta ? <span className='truncate'>· {meta}</span> : null}
            {views != null ? (
              <span className='shrink-0'>
                · <EyeIcon className='inline size-3.5 align-[-2px]' /> {format.number(views)}
                {viewsLabel ? <span className='sr-only'> {viewsLabel}</span> : null}
              </span>
            ) : null}
          </span>
          {extra ? <span className='mt-2 block'>{extra}</span> : null}
        </span>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored post photo URL
          <img src={photo} alt='' loading='lazy' className='size-14 shrink-0 rounded-lg object-cover' />
        ) : null}
      </Link>
    </article>
  )
}
