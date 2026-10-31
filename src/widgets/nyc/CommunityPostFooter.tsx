'use client'

import Link from 'next/link'

import { useCity } from '@hooks/useCity'
import { hrefForCommunityPost } from '@lib/constants/cities'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { maskAnonymousDisplayName } from '@lib/community/anonymous'
import { useT } from '@lib/i18n/client'
import { UserAvatar, AuthorBadges } from '@components'
import type { CommunityPost } from '@/types/nyc'
import { CommunityEngagementBar } from '@widgets/nyc/CommunityEngagementBar'
import { CommunityPostReportAction } from '@widgets/nyc/CommunityPostReportAction'
import { CommunityBlockAction } from '@widgets/nyc/CommunityBlockAction'
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
  editLabel,
  onDelete,
}: CommunityPostFooterProps) {
  const t = useT('community')
  const city = useCity()
  const authorName = anonymous
    ? maskAnonymousDisplayName(t('author.anonymous'))
    : getCommunityAuthorDisplayName(post, null, t)
  const authorInitial = authorName.charAt(0).toUpperCase()
  const photoURL = anonymous ? null : post.authorPhotoURL?.trim() || null

  return (
    <div data-ui='post-footer' className='rounded-2xl border border-black/[0.04] bg-[#f7f8fa] px-4 py-3.5 sm:px-5 sm:py-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          {!anonymous ? (
            <UserAvatar
              photoURL={photoURL}
              initial={authorInitial}
              size='lg'
              className='ring-2 ring-white shadow-sm shadow-black/[0.04]'
            />
          ) : null}
          <div className='flex min-w-0 items-center gap-2'>
            <p className='truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--foreground)]'>
              {authorName}
            </p>
            {!anonymous ? (
              <AuthorBadges schoolId={post.authorSchoolId} workplaceVerified={post.authorWorkplaceVerified} instagramVerified={post.authorInstagramVerified} size='author' />
            ) : null}
          </div>
        </div>

        {isAuthor ? (
          <div className='flex shrink-0 items-center gap-0.5 text-[12px]'>
            <Link
              href={hrefForCommunityPost(post, city, 'edit')}
              className='rounded-lg px-2 py-1 font-medium text-[var(--muted-foreground)] touch-manipulation transition-colors hover:bg-black/[0.04] hover:text-[var(--foreground)]'
            >
              {editLabel ?? t('detail.edit')}
            </Link>
            <button
              type='button'
              onClick={onDelete}
              className='rounded-lg px-2 py-1 font-medium text-red-600/90 touch-manipulation transition-colors hover:bg-red-50 hover:text-red-700'
            >
              {t('detail.delete')}
            </button>
          </div>
        ) : (
          <div className='flex shrink-0 items-center gap-3'>
            <CommunityPostReportAction
              postId={post.id}
              boardId={boardId}
              loginNext={loginNext}
            />
            <CommunityBlockAction
              postId={post.id}
              onBlocked={() => window.location.reload()}
            />
          </div>
        )}
      </div>

      <div className='mt-3.5 flex flex-wrap items-center gap-2 border-t border-black/[0.05] pt-3.5'>
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
