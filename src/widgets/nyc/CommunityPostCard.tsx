import Link from 'next/link'

import { SchoolBadge } from '@components'
import type { CommunityPost } from '@/types/nyc'
import {
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'

interface CommunityPostCardProps {
  post: CommunityPost
  boardId: NycCommunityBoardId
}

export function CommunityPostCard({ post, boardId }: CommunityPostCardProps) {
  const anonymous = isAnonymousBoard(boardId)

  return (
    <Link
      href={`/nyc/${boardId}/${post.id}`}
      className='block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition touch-manipulation active:scale-[0.99] hover:border-[#F64310]/35 hover:shadow-md sm:p-5'
    >
      <div className='flex flex-wrap items-center gap-1.5'>
        <h3 className='text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
          {post.title}
        </h3>
        {anonymous ? (
          <span className='rounded-full bg-[var(--foreground)]/6 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[var(--muted)]'>
            익명
          </span>
        ) : (
          <SchoolBadge schoolId={post.authorSchoolId} />
        )}
      </div>
      {(post.location || post.detail) && (
        <p className='mt-1.5 text-[13px] font-medium text-[var(--muted)] sm:text-sm'>
          {[post.location, post.detail].filter(Boolean).join(' · ')}
        </p>
      )}
      <p className='mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:text-sm'>
        {post.description}
      </p>
    </Link>
  )
}
