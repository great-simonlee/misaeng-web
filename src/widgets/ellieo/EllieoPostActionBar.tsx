'use client'

import type { CommunityPost } from '@/types/nyc'
import { useFormat, useT } from '@lib/i18n/client'
import { CommentIcon } from '@widgets/ellieo/icons'
import { CommunityEngagementBar } from '@widgets/nyc/CommunityEngagementBar'
import { CopyLinkButton } from '@widgets/nyc/CopyLinkButton'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

/**
 * Ellieo post detail on phones: a slim bar pinned above the tab bar (save, recommend, comments, share).
 * The author row stays in the post body (CommunityPostFooter). From 1024px the footer's own action row shows instead.
 */
export function EllieoPostActionBar({
  post,
  boardId,
  loginNext,
}: {
  post: CommunityPost
  boardId: string
  loginNext: string
}) {
  const t = useT('community')
  const format = useFormat()
  return (
    <div
      data-ui='post-action-bar'
      className='fixed inset-x-0 z-[9990] border-t border-[var(--border)] bg-white lg:hidden'
      style={{ bottom: 'var(--bottom-nav-h)' }}
    >
      <div className='mx-auto flex h-14 max-w-[40rem] items-center gap-2 px-4'>
        <PostLikeButton kind='community' id={post.id} boardId={boardId} variant='icon' />
        <CommunityEngagementBar postId={post.id} boardId={boardId} loginNext={loginNext} />
        <button
          type='button'
          onClick={() => document.querySelector('[data-ui="comments"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className='inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3.5 text-[13.5px] font-semibold text-[var(--foreground)]'
          aria-label={t('comments.title')}
        >
          <CommentIcon className='size-[18px]' />
          {format.number(post.commentCount ?? 0)}
        </button>
        <span className='flex-1' />
        <CopyLinkButton variant='icon' />
      </div>
    </div>
  )
}
