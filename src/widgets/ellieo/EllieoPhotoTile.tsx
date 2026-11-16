'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'

import { cn } from '@lib'

/**
 * Photo tile (docs/design/ellieo-classifieds.md v4): 1:1 photo (radius 10) with a dark bottom gradient, price
 * bottom-left (white 18/700) and the category mark bottom-right; optional status pill top-left. Under it: location
 * (12 gray), title (14 ink, max 3 lines) and time (12 gray).
 */
export function EllieoPhotoTile({
  href,
  photo,
  price,
  icon: Icon,
  status,
  location,
  title,
  time,
  dim = false,
}: {
  href: string
  photo: string | null
  price?: string | null
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  status?: string | null
  location?: string | null
  title: string
  time?: string | null
  dim?: boolean
}) {
  return (
    <Link href={href} className='group block min-w-0'>
      <span className='relative block aspect-square overflow-hidden rounded-[10px] bg-[var(--surface)]'>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing / post photo URL
          <img
            src={photo}
            alt=''
            loading='lazy'
            className={cn('size-full object-cover transition duration-300 group-hover:scale-[1.03]', dim && 'opacity-60')}
          />
        ) : (
          <span className='flex size-full items-center justify-center text-[var(--muted)]'>
            <Icon className='size-8' />
          </span>
        )}
        <span aria-hidden className='absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent' />
        {price ? (
          <span className='absolute bottom-2 left-2.5 text-[18px] font-bold tabular-nums leading-none text-white'>{price}</span>
        ) : null}
        <Icon className='absolute bottom-2 right-2.5 size-[22px] text-white' strokeWidth={1.8} />
        {status ? (
          <span className='absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white'>{status}</span>
        ) : null}
      </span>
      {location ? <span className='mt-1.5 block truncate text-[12px] text-[var(--muted)]'>{location}</span> : null}
      <span className='mt-0.5 line-clamp-3 block text-[14px] leading-snug text-[var(--foreground)]'>{title}</span>
      {time ? <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>{time}</span> : null}
    </Link>
  )
}
