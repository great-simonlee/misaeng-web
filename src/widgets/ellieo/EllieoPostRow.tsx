'use client'

import { useCity } from '@hooks/useCity'
import { cn } from '@lib'
import { getCommunityAuthorDisplayName } from '@lib/community/author'
import { htmlToPlainText } from '@lib/community/html'
import { sortJobReviewTimelineByDate } from '@lib/community/jobReview'
import { hrefForCommunityPost } from '@lib/constants/cities'
import type { NycCommunityBoardId } from '@lib/constants/nyc'
import { getVerifiedSchool } from '@lib/constants/schools'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { EllieoBoardTag, EllieoFeedCard, EllieoPersonAvatar } from '@widgets/ellieo/EllieoFeedCard'
import { communityForBoard } from '@widgets/ellieo/communities'
import { CptOptTypeBadge } from '@widgets/nyc/CptOptTypeBadge'
import { JobReviewTypeBadge } from '@widgets/nyc/JobReviewTypeBadge'
import { PostLikeButton } from '@widgets/nyc/PostLikeButton'

const MAX_DOTS = 6

/** Step count and the last step's stage notes (plain text), for visa (status) and job review posts */
function getTimeline(post: CommunityPost, boardId: NycCommunityBoardId) {
  if (boardId === 'status') {
    const steps = [...(post.cptOptTimeline ?? [])].sort((a, b) => a.date.localeCompare(b.date))
    const last = steps.at(-1)
    const notes = last ? htmlToPlainText(last.stageReviewHtml ?? '').trim() : ''
    return { count: steps.length, last: notes || (last ? (last.resultReceived || last.submitted || last.prepared).trim() : '') }
  }
  if (boardId === 'job-review') {
    const steps = sortJobReviewTimelineByDate(post.jobReviewTimeline ?? [])
    const last = steps.at(-1)
    const notes = last ? htmlToPlainText(last.stageReviewHtml ?? '').trim() : ''
    return { count: steps.length, last: notes || (last ? last.stageLabel.trim() : '') }
  }
  return { count: 0, last: '' }
}

/**
 * Ellieo board list item: a feed card (EllieoFeedCard) — person first, then title, excerpt, the visa / job review
 * step summary, reactions and save. Misaeng keeps CommunityPostCard.
 */
export function EllieoPostRow({ post, boardId }: { post: CommunityPost; boardId: NycCommunityBoardId }) {
  const t = useT('community')
  const th = useT('hub')
  const tn = useT('nav')
  const format = useFormat()
  const city = useCity()
  const anonymous = boardId === 'anonymous' && !post.showNickname
  const name = anonymous ? t('author.anonymous') : getCommunityAuthorDisplayName(post, null, t)
  const photo = anonymous ? null : post.authorPhotoURL?.trim() || null
  const school = anonymous ? null : getVerifiedSchool(post.authorSchoolId ?? '')?.shortName ?? null
  const timeline = getTimeline(post, boardId)
  const dots = Math.min(timeline.count, MAX_DOTS)
  const excerpt = (boardId === 'status' ? post.cptOptTips?.trim() : '') || post.description
  const typeBadge =
    boardId === 'status' ? (
      <CptOptTypeBadge type={post.cptOptType} className='!py-0.5' />
    ) : boardId === 'job-review' ? (
      <JobReviewTypeBadge type={post.jobReviewType} className='!py-0.5' />
    ) : null
  const boardKey = boardId === 'cpt-opt' || boardId === 'visa' || boardId === 'green-card' ? 'status' : boardId

  return (
    <EllieoFeedCard
      href={hrefForCommunityPost(post, city)}
      avatar={<EllieoPersonAvatar photo={photo} name={name} anonymous={anonymous} />}
      name={name}
      verified={Boolean(school)}
      meta={[school, format.relative(post.createdAt)].filter(Boolean).join(' · ')}
      tag={<EllieoBoardTag boardId={boardKey} label={tn(`ellieo.short.${boardKey}`)} />}
      community={communityForBoard(boardKey)}
      communityName={communityForBoard(boardKey) ? tn(`ellieo.communities.${communityForBoard(boardKey)!.key}.name`) : undefined}
      badge={typeBadge}
      title={post.title}
      excerpt={excerpt}
      extra={
        timeline.count > 0 ? (
          <span className='flex min-w-0 items-center gap-2.5 rounded-xl bg-[var(--surface)] px-3 py-2'>
            <span aria-hidden className='flex shrink-0 items-center'>
              {Array.from({ length: dots }, (_, index) => (
                <span key={index} className='flex items-center'>
                  {index > 0 ? <span className='h-0.5 w-2.5 bg-[var(--brand)]/30' /> : null}
                  <span
                    className={cn(
                      'size-2.5 rounded-full',
                      index === dots - 1 ? 'bg-white ring-2 ring-[var(--brand)]' : 'bg-[var(--brand)]',
                    )}
                  />
                </span>
              ))}
            </span>
            <span className='min-w-0 truncate text-[13px] font-semibold text-[var(--brand-deep)]'>
              {th('ellieo.row.steps', { count: timeline.count })}
              {timeline.last ? <span className='font-normal text-[var(--foreground)]'> · {timeline.last}</span> : null}
            </span>
          </span>
        ) : null
      }
      likes={post.recommendCount}
      comments={post.commentCount}
      views={post.viewCount}
      viewsLabel={th('ellieo.row.views', { count: '' }).trim()}
      action={<PostLikeButton kind='community' id={post.id} boardId={boardId} variant='icon' />}
    />
  )
}
