'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useCity } from '@hooks/useCity'
import { cn } from '@lib'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { sortJobReviewTimelineByDate } from '@lib/community/jobReview'
import { hrefForCommunityPost } from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import { getVerifiedSchool } from '@lib/constants/schools'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BadgeCheckIcon, ChatIcon, HeartIcon } from '@widgets/ellieo/icons'
import { CptOptTypeBadge } from '@widgets/nyc/CptOptTypeBadge'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #1f5eff, #12b5cb)',
  'linear-gradient(135deg, #0b8f6a, #7fd8b8)',
  'linear-gradient(135deg, #f2a516, #ff5a5f)',
  'linear-gradient(135deg, #7a4cff, #c13584)',
]
const DAY_MS = 86_400_000
const MAX_DOTS = 6

function gradientFor(text: string): string {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

/** Photo when it loads; otherwise a gradient initial (some stored profile photo URLs no longer resolve) */
function AuthorAvatar({ photo, name, anonymous }: { photo: string | null; name: string; anonymous: boolean }) {
  const [failed, setFailed] = useState(false)
  if (photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external profile URL
      <img src={photo} alt='' onError={() => setFailed(true)} className='size-7 shrink-0 rounded-full object-cover' />
    )
  }
  return (
    <span
      aria-hidden
      className='flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold uppercase text-white'
      style={{ background: anonymous ? '#9aa4b2' : gradientFor(name) }}
    >
      {anonymous ? '?' : name.charAt(0)}
    </span>
  )
}

/** Days between the first and last YYYY-MM-DD dates, or null when the dates aren't usable */
function spanDays(dates: string[]): number | null {
  const times = dates
    .map((date) => (/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? Date.parse(`${date.trim()}T12:00:00`) : NaN))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b)
  if (times.length < 2) return null
  return Math.round((times[times.length - 1] - times[0]) / DAY_MS)
}

/** Steps and the label of the last one, for visa (status) and job review posts */
function getTimeline(post: CommunityPost, boardId: NycCommunityBoardId) {
  if (boardId === 'status') {
    const steps = [...(post.cptOptTimeline ?? [])].sort((a, b) => a.date.localeCompare(b.date))
    const last = steps.at(-1)
    return {
      count: steps.length,
      last: last ? (last.resultReceived || last.submitted || last.prepared).trim() : '',
      days: spanDays(steps.map((step) => step.date)),
    }
  }
  if (boardId === 'job-review') {
    const steps = sortJobReviewTimelineByDate(post.jobReviewTimeline ?? [])
    const last = steps.at(-1)
    return {
      count: steps.length,
      last: last ? last.stageLabel.trim() : '',
      days: spanDays(steps.map((step) => step.date)),
    }
  }
  return { count: 0, last: '', days: null }
}

/**
 * Ellieo board list item, same shape as the home community feed:
 * author line → title → one-line excerpt → step dots (visa / job reviews) → reactions.
 * Misaeng keeps CommunityPostCard.
 */
export function EllieoPostRow({ post, boardId }: { post: CommunityPost; boardId: NycCommunityBoardId }) {
  const t = useT('community')
  const th = useT('hub')
  const format = useFormat()
  const city = useCity()
  const anonymous = boardId === 'anonymous'
  const name = anonymous ? t('author.anonymous') : getCommunityAuthorDisplayName(post, null, t)
  const photo = anonymous ? null : post.authorPhotoURL?.trim() || null
  const school = anonymous ? null : getVerifiedSchool(post.authorSchoolId ?? '')?.shortName ?? null
  const timeline = getTimeline(post, boardId)
  const dots = Math.min(timeline.count, MAX_DOTS)
  const excerpt = (boardId === 'status' ? post.cptOptTips?.trim() : '') || post.description

  return (
    <article className='border-b border-[var(--border)]'>
      <div className='relative'>
        <Link href={hrefForCommunityPost(post, city)} data-ui='hover-row' className='group block py-4'>
          {/* Author line */}
          <span className='flex items-center gap-2 pr-10'>
            <AuthorAvatar photo={photo} name={name} anonymous={anonymous} />
            <span className='flex min-w-0 flex-1 items-center gap-1 text-[13px]'>
              <span className='truncate font-semibold text-[var(--foreground)]'>{name}</span>
              {school ? <BadgeCheckIcon className='size-3.5 shrink-0 text-[var(--ellieo-jade)]' /> : null}
              <span className='shrink-0 text-[var(--muted)]'>
                {school ? `· ${school} ` : ''}· {format.relative(post.createdAt)}
              </span>
            </span>
            {boardId === 'status' ? <CptOptTypeBadge type={post.cptOptType} className='shrink-0 !py-0.5' /> : null}
            {boardId === 'job-review' ? (
              <JobReviewTypeBadge type={post.jobReviewType} className='shrink-0 !py-0.5' />
            ) : null}
          </span>

          {/* Title + excerpt */}
          <span className='mt-2 line-clamp-2 text-[16.5px] font-bold leading-snug tracking-[-0.015em] text-[var(--foreground)]'>
            {post.title}
          </span>
          {excerpt ? (
            <span className='mt-1 line-clamp-1 text-[14px] leading-relaxed text-[var(--muted)]'>{excerpt}</span>
          ) : null}

          {/* Steps: one dot per step, the last one filled, then the last step and how long it took */}
          {timeline.count > 0 ? (
            <span className='mt-3 flex min-w-0 items-center gap-2.5 rounded-xl bg-[#f8f9fc] px-3 py-2'>
              <span aria-hidden className='flex shrink-0 items-center'>
                {Array.from({ length: dots }, (_, index) => (
                  <span key={index} className='flex items-center'>
                    {index > 0 ? <span className='h-px w-3 bg-[var(--brand)]/35' /> : null}
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        index === dots - 1 ? 'bg-[var(--brand)] ring-[3px] ring-[var(--brand)]/15' : 'bg-[var(--brand)]/45',
                      )}
                    />
                  </span>
                ))}
              </span>
              <span className='min-w-0 truncate text-[12.5px] font-medium text-[var(--muted-foreground)]'>
                {th('ellieo.row.steps', { count: timeline.count })}
                {timeline.last ? <span className='text-[var(--foreground)]'> · {timeline.last}</span> : null}
              </span>
              {timeline.days !== null ? (
                <span className='ml-auto shrink-0 text-[12.5px] font-bold text-[var(--brand-deep)]'>
                  {th('ellieo.row.days', { count: timeline.days })}
                </span>
              ) : null}
            </span>
          ) : null}

          {/* Reactions */}
          <span className='mt-3 flex items-center gap-4 text-[12.5px] font-medium text-[var(--muted)]'>
            <span className='inline-flex items-center gap-1'>
              <HeartIcon className='size-4' />
              {format.number(post.recommendCount)}
            </span>
            <span className='inline-flex items-center gap-1'>
              <ChatIcon className='size-4' />
              {format.number(post.commentCount)}
            </span>
            <span>{th('ellieo.row.views', { count: format.number(post.viewCount) })}</span>
          </span>
        </Link>
        {/* Save, outside the link so it doesn't open the post */}
        <div className='absolute right-0 top-3'>
          <PostLikeButton kind='community' id={post.id} boardId={boardId} variant='icon' />
        </div>
      </div>
    </article>
  )
}
