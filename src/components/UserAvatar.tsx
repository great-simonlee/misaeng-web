'use client'

import { useState } from 'react'

import { cn } from '@lib'
import { avatarInitials } from '@lib/community/author'

type UserAvatarProps = {
  photoURL?: string | null
  /**
   * 사진이 없거나 못 불러올 때 이니셜을 만드는 이름 (닉네임 등). 비어 있으면 기본 프로필 아이콘.
   * 익명·탈퇴 회원처럼 이름을 보여 주면 안 되는 경우에는 넘기지 않는다.
   */
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  muted?: boolean
  /** 사진 대체 텍스트 (장식용이면 생략) */
  alt?: string
  className?: string
}

const SIZE_CLASS = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-[12px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-11 w-11 text-[15px]',
  xl: 'size-[5.5rem] text-[30px] lg:size-[6.25rem] lg:text-[34px]',
} as const

function isUsablePhotoURL(url: string | null | undefined): url is string {
  if (!url?.trim()) return false
  const trimmed = url.trim().toLowerCase()
  // 예전에 사진 대신 profile.json 주소가 저장된 경우가 있다 — 이미지 주소만 쓴다
  if (trimmed.startsWith('blob:') || trimmed.endsWith('.json')) return false
  return true
}

/** 사람 실루엣 — 이름도 사진도 없을 때의 기본 프로필 아이콘 */
function PersonIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className='h-[55%] w-[55%]' aria-hidden>
      <path d='M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z' />
    </svg>
  )
}

/**
 * 사용자 아바타 (헤더·마이페이지·글·댓글 공통).
 * 사진 → 없거나 실패하면 이니셜(한글 이름은 첫 글자) → 이름도 없으면 사람 아이콘.
 */
export function UserAvatar({
  photoURL,
  name,
  size = 'md',
  muted = false,
  alt = '',
  className,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedPhoto = isUsablePhotoURL(photoURL) ? photoURL.trim() : null
  const showPhoto = Boolean(resolvedPhoto) && failedSrc !== resolvedPhoto
  const sizeClass = SIZE_CLASS[size]
  const initials = avatarInitials(name)

  if (showPhoto) {
    return (
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-full bg-[#e8eaee]',
          sizeClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 외부 프로필 URL (Google 등) */}
        <img
          src={resolvedPhoto!}
          alt={alt}
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
        'flex shrink-0 items-center justify-center rounded-full font-bold leading-none',
        sizeClass,
        initials
          ? muted
            ? 'bg-white text-[var(--muted)]'
            : 'bg-white text-[var(--brand)]'
          : 'bg-[#e8eaee] text-[#9aa3af]',
        initials.length > 1 && 'tracking-[-0.04em]',
        className,
      )}
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      {initials || <PersonIcon />}
    </div>
  )
}
