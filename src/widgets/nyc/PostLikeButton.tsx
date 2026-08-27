'use client'

import { type MouseEvent } from 'react'

import { usePostLike } from '@hooks/usePostLikes'
import { cn } from '@lib'
import type { PostLikeKind } from '@lib/utils/postLikes'

type PostLikeButtonProps = {
  kind: PostLikeKind
  id: string
  boardId?: string
  /** overlay: 사진 위 / pill: 칩 / icon: 밝은 배경용 아이콘만 */
  variant?: 'overlay' | 'pill' | 'icon'
  className?: string
  stopPropagation?: boolean
}

export function PostLikeButton({
  kind,
  id,
  boardId,
  variant = 'pill',
  className,
  stopPropagation = true,
}: PostLikeButtonProps) {
  const { liked, toggle } = usePostLike({ kind, id, boardId })

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.preventDefault()
      event.stopPropagation()
    }
    toggle()
  }

  if (variant === 'overlay') {
    return (
      <button
        type='button'
        onClick={handleClick}
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        aria-pressed={liked}
        className={cn(
          'relative shrink-0 touch-manipulation transition hover:scale-110 active:scale-95',
          className,
        )}
      >
        <span className='absolute -inset-2' aria-hidden />
        <OverlayHeartIcon
          filled={liked}
          className='relative block size-6 sm:size-[1.35rem]'
        />
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        type='button'
        onClick={handleClick}
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        aria-pressed={liked}
        className={cn(
          'relative inline-flex shrink-0 touch-manipulation transition hover:scale-110 active:scale-95',
          liked ? 'text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
          className,
        )}
      >
        <span className='absolute -inset-2' aria-hidden />
        <PillHeartIcon filled={liked} className='relative size-5' />
      </button>
    )
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      aria-pressed={liked}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold touch-manipulation transition',
        liked
          ? 'bg-[#fff5f2] text-[var(--brand)] ring-1 ring-[var(--brand)]/20'
          : 'bg-white text-[var(--muted-foreground)] ring-1 ring-black/[0.08] hover:bg-[#fafbfc] hover:text-[var(--foreground)]',
        className,
      )}
    >
      <PillHeartIcon filled={liked} className='size-3.5' />
      {liked ? '좋아요' : '좋아요'}
    </button>
  )
}

function OverlayHeartIcon({
  filled,
  className,
}: {
  filled: boolean
  className?: string
}) {
  return (
    <svg
      viewBox='0 0 32 32'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
    >
      <path
        d='m16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z'
        fill={filled ? '#F64310' : 'none'}
        stroke='#fff'
        strokeWidth='2'
      />
    </svg>
  )
}

function PillHeartIcon({
  filled,
  className,
}: {
  filled: boolean
  className?: string
}) {
  return (
    <svg
      viewBox='0 0 24 24'
      className={className}
      aria-hidden
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
    </svg>
  )
}
