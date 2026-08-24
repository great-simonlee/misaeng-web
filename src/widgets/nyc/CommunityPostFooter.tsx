'use client'

import Link from 'next/link'

import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import { CommunityEngagementBar } from '@widgets/nyc/CommunityEngagementBar'
import { CopyLinkButton } from '@widgets/nyc/CopyLinkButton'

type CommunityPostFooterProps = {
  post: CommunityPost
  boardId: string
  anonymous?: boolean
  isAuthor?: boolean
  loginNext: string
  onDelete?: () => void
}

export function CommunityPostFooter({
  post,
  boardId,
  anonymous = false,
  isAuthor = false,
  loginNext,
  onDelete,
}: CommunityPostFooterProps) {
  const authorName = anonymous
    ? '익명'
    : getCommunityAuthorDisplayName(post)
  const authorInitial = authorName.charAt(0).toUpperCase()

  return (
    <div className='border-t border-black/[0.04] bg-gradient-to-b from-[#f8f9fb] via-[#fafbfc] to-white px-5 py-6 sm:px-8 sm:py-7'>
      {/* 작성자 */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold shadow-sm',
              anonymous
                ? 'bg-[#eef0f3] text-[var(--muted)]'
                : 'bg-gradient-to-br from-[var(--brand)]/20 via-[var(--brand)]/10 to-white text-[var(--brand)] ring-1 ring-[var(--brand)]/15',
            )}
          >
            {authorInitial}
          </div>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium tracking-wide text-[var(--muted)]'>
              작성자
            </p>
            <p className='truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
              {authorName}
            </p>
          </div>
        </div>
        <CopyLinkButton variant='icon' />
      </div>

      {/* 반응 + 공유 */}
      <div className='mt-5 space-y-2.5'>
        <CommunityEngagementBar
          postId={post.id}
          boardId={boardId}
          loginNext={loginNext}
          layout='cards'
        />
        <CopyLinkButton variant='ghost' className='w-full sm:hidden' />
      </div>

      {/* 작성자 관리 */}
      {isAuthor ? (
        <div className='mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
          <div className='grid grid-cols-2 divide-x divide-black/[0.05]'>
            <Link
              href={`/nyc/${boardId}/${post.id}/edit`}
              className='inline-flex h-12 items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#fafbfc]'
            >
              <EditIcon />
              수정
            </Link>
            <button
              type='button'
              onClick={onDelete}
              className='inline-flex h-12 items-center justify-center gap-1.5 text-[13px] font-medium text-red-600 touch-manipulation transition hover:bg-red-50/80'
            >
              <TrashIcon />
              삭제
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EditIcon() {
  return (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M12 20h9' />
      <path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d='M3 6h18' />
      <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' />
      <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' />
    </svg>
  )
}
