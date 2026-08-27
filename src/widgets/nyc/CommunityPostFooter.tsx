'use client'

import Link from 'next/link'

import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { UserAvatar } from '@components'
import type { CommunityPost } from '@/types/nyc'
import { CommunityEngagementBar } from '@widgets/nyc/CommunityEngagementBar'
import { CommunityPostReportAction } from '@widgets/nyc/CommunityPostReportAction'
import { CopyLinkButton } from '@widgets/nyc/CopyLinkButton'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

type CommunityPostFooterProps = {
  post: CommunityPost
  boardId: string
  anonymous?: boolean
  isAuthor?: boolean
  loginNext: string
  editLabel?: string
  onDelete?: () => void
}

export function CommunityPostFooter({
  post,
  boardId,
  anonymous = false,
  isAuthor = false,
  loginNext,
  editLabel = '수정',
  onDelete,
}: CommunityPostFooterProps) {
  const authorName = anonymous
    ? '익명'
    : getCommunityAuthorDisplayName(post)
  const authorInitial = authorName.charAt(0).toUpperCase()
  const photoURL = anonymous ? null : post.authorPhotoURL?.trim() || null

  return (
    <div className='rounded-2xl bg-[#f7f8fa] px-4 py-4 sm:px-5'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <UserAvatar
            photoURL={photoURL}
            initial={authorInitial}
            size='md'
            muted={anonymous}
          />
          <p className='truncate text-[14px] font-semibold text-[var(--foreground)]'>
            {authorName}
          </p>
        </div>

        {isAuthor ? (
          <div className='flex shrink-0 items-center gap-2 text-[13px]'>
            <Link
              href={`/nyc/${boardId}/${post.id}/edit`}
              className='font-medium text-[var(--muted-foreground)] touch-manipulation hover:text-[var(--foreground)]'
            >
              {editLabel}
            </Link>
            <span className='text-black/10' aria-hidden>
              ·
            </span>
            <button
              type='button'
              onClick={onDelete}
              className='font-medium text-red-600 touch-manipulation hover:text-red-700'
            >
              삭제
            </button>
          </div>
        ) : (
          <CommunityPostReportAction
            postId={post.id}
            boardId={boardId}
            loginNext={loginNext}
          />
        )}
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <PostLikeButton
          kind='community'
          id={post.id}
          boardId={boardId}
          variant='pill'
        />
        <CommunityEngagementBar
          postId={post.id}
          boardId={boardId}
          loginNext={loginNext}
        />
        <CopyLinkButton variant='pill' />
      </div>
    </div>
  )
}
