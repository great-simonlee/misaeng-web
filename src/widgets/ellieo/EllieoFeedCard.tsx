'use client'

import Link from 'next/link'
import { createElement, useState, type ReactNode } from 'react'

import { useFormat } from '@lib/i18n/client'
import { ArrowUpIcon, BadgeCheckIcon, ChatIcon, CommentIcon, EyeIcon } from '@widgets/ellieo/icons'
import { EllieoCommunityAvatar } from '@widgets/ellieo/EllieoCommunityAvatar'
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
 * Ellieo post row (docs/design/ellieo-community.md): flat, full width, hairline under it. Meta line = community
 * avatar · e/Community · author · verified · time; then title (16/600, 2 lines), body preview (2 lines), optional
 * extra block and 16:9 photo, then the action bar (up · comments · views). `action` (like/save) sits at the right
 * of the action bar, outside the link. `avatar`/`tag` are kept for callers without a community.
 */
export function EllieoFeedCard({
  href,
  avatar,
  name,
  verified,
  meta,
  tag,
  community,
  communityName,
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
  return (
    <article className='relative border-b border-[var(--border)] bg-white'>
      <Link href={href} className='group block py-3.5'>
        <span className='flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--muted-foreground)]'>
          {community ? (
            <>
              <EllieoCommunityAvatar community={community} size={20} />
              <span className='shrink-0 font-semibold text-[var(--foreground)]'>{communityName}</span>
              <span aria-hidden>·</span>
            </>
          ) : (
            <span className='shrink-0 [&>*]:!size-5'>{avatar}</span>
          )}
          <span className='truncate'>{name}</span>
          {verified ? <BadgeCheckIcon className='size-3.5 shrink-0 text-[var(--brand)]' /> : null}
          {meta ? <span className='truncate text-[var(--muted)]'>· {meta}</span> : null}
          {!community && tag ? <span className='ml-auto'>{tag}</span> : null}
        </span>

        {badge ? <span className='mt-2 flex flex-wrap gap-1.5'>{badge}</span> : null}
        <span className={`${badge ? 'mt-1.5' : 'mt-2'} line-clamp-2 text-[16px] font-semibold leading-snug text-[var(--foreground)] group-hover:underline-offset-2`}>
          {title}
        </span>
        {excerpt ? (
          <span className='mt-1 line-clamp-2 text-[15px] leading-[1.45] text-[var(--muted-foreground)]'>{excerpt}</span>
        ) : null}
        {extra ? <span className='mt-2.5 block'>{extra}</span> : null}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored post photo URL
          <img src={photo} alt='' loading='lazy' className='mt-2.5 aspect-video w-full rounded-xl object-cover' />
        ) : null}

        <span className='mt-2.5 flex items-center gap-4 pr-12 text-[12.5px] font-semibold text-[var(--muted-foreground)]'>
          {likes != null ? (
            <span className='inline-flex items-center gap-1'>
              <ArrowUpIcon className='size-[18px]' />
              {format.number(likes)}
            </span>
          ) : null}
          {comments != null ? (
            <span className='inline-flex items-center gap-1'>
              <CommentIcon className='size-[18px]' />
              {format.number(comments)}
            </span>
          ) : null}
          {views != null ? (
            <span className='inline-flex items-center gap-1'>
              <EyeIcon className='size-[18px]' />
              <span>
                {format.number(views)}
                {viewsLabel ? <span className='sr-only'> {viewsLabel}</span> : null}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
      {action ? <div className='absolute bottom-2.5 right-0'>{action}</div> : null}
    </article>
  )
}
