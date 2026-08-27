'use client'

import { useState } from 'react'

import { cn } from '@lib'

type UserAvatarProps = {
  photoURL?: string | null
  /** 사진 없음·로드 실패 시 표시 */
  initial: string
  size?: 'sm' | 'md' | 'lg'
  muted?: boolean
  className?: string
}

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-[12px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-11 w-11 text-[15px]',
} as const

function isUsablePhotoURL(url: string | null | undefined): url is string {
  if (!url?.trim()) return false
  const trimmed = url.trim()
  if (trimmed.startsWith('blob:')) return false
  return true
}

export function UserAvatar({
  photoURL,
  initial,
  size = 'md',
  muted = false,
  className,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedPhoto = isUsablePhotoURL(photoURL) ? photoURL.trim() : null
  const showPhoto = Boolean(resolvedPhoto) && failedSrc !== resolvedPhoto
  const sizeClass = SIZE_CLASS[size]

  if (showPhoto) {
    return (
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-full bg-[#e8eaee]',
          sizeClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedPhoto!}
          alt=''
          className='h-full w-full object-cover'
          referrerPolicy='no-referrer'
          onError={() => setFailedSrc(resolvedPhoto)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        sizeClass,
        muted
          ? 'bg-white text-[var(--muted)]'
          : 'bg-white text-[var(--brand)]',
        className,
      )}
      aria-hidden
    >
      {initial.charAt(0).toUpperCase()}
    </div>
  )
}
