'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { useFormat } from '@lib/i18n/client'
import { BadgeCheckIcon, CommentIcon, EyeIcon, HeartIcon } from '@widgets/ellieo/icons'

/** Avatar fills when there is no photo: soft tints, ink-friendly */
const AVATAR_FILLS = ['#7c5cff', '#16b47e', '#e8861a', '#e0579b', '#2a9fd6', '#14121f']

function fillFor(text: string): string {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_FILLS[hash % AVATAR_FILLS.length]
}

/** Person-first avatar: photo when it loads, otherwise a colored initial; anonymous = 💬 on violet-soft */
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
      <span aria-hidden style={style} className='flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[18px]'>
        💬
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

/** Emoji board tag (right of the author row) */
export function EllieoBoardTag({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--foreground)]'>
      <span aria-hidden>{emoji}</span>
      <span className='hidden min-[420px]:inline'>{label}</span>
    </span>
  )
}

/**
 * Ellieo feed card (docs/design/ellieo-social.md): avatar · name · verified · meta, tag on the right,
 * then title, two-line excerpt, optional extra block and photo, then reactions. `action` (e.g. save) sits at the
 * right of the reactions row, outside the link.
 */
export function EllieoFeedCard({
  href,
  avatar,
  name,
  verified,
  meta,
  tag,
  title,
  badge,
  excerpt,
  extra,
  photo,
  likes,
  comments,
  views,
  viewsLabel,
  action,
}: {
  href: string
  avatar: ReactNode
  name: string
  verified?: boolean
  meta?: string
  tag?: ReactNode
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
  return (
    <article className='relative rounded-[1.5rem] bg-white shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)] transition hover:shadow-[0_0_0_1px_var(--border-muted),0_14px_30px_-18px_rgb(20_18_31/0.28)]'>
      <Link href={href} className='group block p-4 sm:p-5'>
        <span className='flex items-center gap-2.5'>
          {avatar}
          <span className='min-w-0 flex-1'>
            <span className='flex min-w-0 items-center gap-1'>
              <span className='truncate text-[14.5px] font-bold text-[var(--foreground)]'>{name}</span>
              {verified ? <BadgeCheckIcon className='size-4 shrink-0 text-[var(--brand)]' /> : null}
            </span>
            {meta ? <span className='block truncate text-[12.5px] text-[var(--muted)]'>{meta}</span> : null}
          </span>
          {tag}
        </span>

        {badge ? <span className='mt-3 flex flex-wrap gap-1.5'>{badge}</span> : null}
        <span className={`${badge ? 'mt-1.5' : 'mt-3'} line-clamp-2 text-[17px] font-bold leading-snug tracking-[-0.015em] text-[var(--foreground)]`}>
          {title}
        </span>
        {excerpt ? (
          <span className='mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-[var(--muted-foreground)]'>{excerpt}</span>
        ) : null}
        {extra ? <span className='mt-3 block'>{extra}</span> : null}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored post photo URL
          <img src={photo} alt='' loading='lazy' className='mt-3 aspect-[4/3] w-full rounded-[1.125rem] object-cover' />
        ) : null}

        <span className='mt-3.5 flex items-center gap-4 pr-10 text-[13px] font-semibold text-[var(--muted)]'>
          {likes != null ? (
            <span className='inline-flex items-center gap-1.5'>
              <HeartIcon className='size-[18px]' />
              {format.number(likes)}
            </span>
          ) : null}
          {comments != null ? (
            <span className='inline-flex items-center gap-1.5'>
              <CommentIcon className='size-[18px]' />
              {format.number(comments)}
            </span>
          ) : null}
          {views != null ? (
            <span className='inline-flex items-center gap-1.5'>
              <EyeIcon className='size-[18px]' />
              <span>
                {format.number(views)}
                {viewsLabel ? <span className='sr-only'> {viewsLabel}</span> : null}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
      {action ? <div className='absolute bottom-3 right-3 sm:bottom-4 sm:right-4'>{action}</div> : null}
    </article>
  )
}
