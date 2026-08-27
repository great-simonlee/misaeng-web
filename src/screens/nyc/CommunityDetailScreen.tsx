'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState, PullToRefresh, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  deleteCommunityPostRequest,
  fetchCommunityPost,
} from '@lib/community/client'
import { recordCommunityView } from '@lib/community/engagement.client'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'
import {
  formatRoommateBudget,
  formatRoommateMoveInDate,
  getRoommateLookingForLabel,
} from '@lib/community/roommate'
import {
  BoardBackLink,
  BoardMetaChip,
  BoardPageShell,
  BoardSurface,
  boardToneForId,
} from '@widgets/nyc/BoardPageShell'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityCommentsSection } from '@widgets/nyc/CommunityCommentsSection'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { FoodDetailContent } from '@widgets/nyc/FoodDetailContent'
import { CptOptDetailContent } from '@widgets/nyc/CptOptDetailContent'
import { JobReviewDetailContent } from '@widgets/nyc/JobReviewDetailContent'
import { EmptyState } from '@widgets/nyc/EmptyState'

interface CommunityDetailScreenProps {
  boardId: NycCommunityBoardId
  title: string
  postId: string
}

export function CommunityDetailScreen({
  boardId,
  title,
  postId,
}: CommunityDetailScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user } = useAuth()
  const { error: toastError, success } = useToast()
  const router = useRouter()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPost = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await fetchCommunityPost(postId)
        setPost(data)
        setError(null)
      } catch (err) {
        const msg = getErrorMessage(err, '글을 불러오지 못했어요')
        setError(msg)
        if (!opts?.silent) toastError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [postId, toastError],
  )

  useEffect(() => {
    let cancelled = false
    void loadPost().catch(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [loadPost])

  useEffect(() => {
    if (!postId) return
    void recordCommunityView(postId).then((result) => {
      if (!result) return
      setPost((current) => {
        if (!current) return current
        if ('viewCount' in result) {
          return { ...current, viewCount: result.viewCount }
        }
        return { ...current, viewCount: current.viewCount + 1 }
      })
    })
  }, [postId])

  const refreshPost = useCallback(async () => {
    await loadPost({ silent: true })
  }, [loadPost])

  async function handleDelete() {
    if (!post || !user) return
    const ok = window.confirm(
      `"${post.title}" 글을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`,
    )
    if (!ok) return
    try {
      await deleteCommunityPostRequest(post.id)
      success('글을 삭제했어요')
      router.push('/nyc/me/posts')
    } catch (err) {
      toastError(getErrorMessage(err, '삭제에 실패했어요'))
    }
  }

  if (loading) {
    return (
      <PullToRefresh onRefresh={refreshPost}>
        <BoardPageShell width='narrow'>
          <LoadingState fullPage label='글을 불러오는 중이에요…' />
        </BoardPageShell>
      </PullToRefresh>
    )
  }

  if (
    error ||
    !post ||
    post.status === 'closed' ||
    post.categoryId !== boardId
  ) {
    return (
      <PullToRefresh onRefresh={refreshPost}>
        <BoardPageShell width='narrow' className='py-12'>
          <EmptyState
            title='게시글을 찾을 수 없습니다'
            description={error ?? '삭제된 글일 수 있습니다.'}
            actionHref={`/nyc/${boardId}`}
            actionLabel={`${title} 목록으로`}
          />
        </BoardPageShell>
      </PullToRefresh>
    )
  }

  const isAuthor = user?.uid === post.authorUid && !post.id.startsWith('mock-')
  const anonymous = isAnonymousBoard(boardId)
  const isFood = boardId === 'food'
  const isCptOpt = boardId === 'status'
  const isJobReview = boardId === 'job-review'
  const isRoommate = boardId === 'roommate'
  const bodyHtml = post.contentHtml || `<p>${post.description}</p>`
  const tone = boardToneForId(boardId)
  const roommateBudget = formatRoommateBudget(post.roommateBudgetMax)
  const roommateMoveIn = formatRoommateMoveInDate(post.roommateMoveInDate)
  const roommateType = getRoommateLookingForLabel(post.roommateLookingFor)
  const metaBits = [
    post.location && {
      label: meta.locationLabel,
      value: post.location,
    },
    isRoommate && roommateType
      ? { label: '유형', value: roommateType }
      : post.detail &&
          meta.detailLabel && {
            label: meta.detailLabel,
            value:
              boardId === 'marketplace' ? `$${post.detail}` : post.detail,
          },
    isRoommate && roommateBudget
      ? { label: '월 예산', value: `${roommateBudget}/월` }
      : null,
    isRoommate && roommateMoveIn
      ? { label: '입주 희망일', value: roommateMoveIn }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <PullToRefresh onRefresh={refreshPost}>
      <BoardPageShell width='narrow'>
        <div
          className={
            isFood || isCptOpt || isJobReview
              ? 'pb-16 pt-0 sm:pb-20 sm:pt-6 lg:pt-8'
              : 'pb-16 pt-5 sm:pb-20 sm:pt-7'
          }
        >
          {/* 맛집은 히어로 위 뒤로가기가 있어 상단 링크는 생략 */}
          {!isFood ? (
            <BoardBackLink
              href={`/nyc/${boardId}`}
              label={`${title} 목록`}
              className={isCptOpt || isJobReview ? 'mb-4 px-1 sm:px-0' : 'mb-4'}
            />
          ) : null}

          {isFood ? (
            <FoodDetailContent
              post={post}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : isCptOpt ? (
            <CptOptDetailContent
              post={post}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : isJobReview ? (
            <JobReviewDetailContent
              post={post}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : (
            <>
              <BoardSurface as='article' className='overflow-hidden'>
                <div className='border-b border-black/[0.04] bg-gradient-to-b from-white to-[#fafbfc] px-5 py-5 sm:px-8 sm:py-7'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <BoardMetaChip tone={tone}>{title}</BoardMetaChip>
                    {anonymous ? (
                      <BoardMetaChip>익명</BoardMetaChip>
                    ) : (
                      <SchoolBadge schoolId={post.authorSchoolId} />
                    )}
                    <span className='text-[12px] text-[var(--muted)]'>
                      {formatCommunityRelativeTime(post.createdAt)}
                    </span>
                    <span className='text-[12px] text-[var(--muted)]'>
                      조회 {formatCommunityCount(post.viewCount)}
                    </span>
                  </div>

                  <h1 className='mt-3.5 text-[1.55rem] font-semibold leading-[1.25] tracking-[-0.035em] text-[var(--foreground)] sm:text-[1.9rem]'>
                    {post.title}
                  </h1>

                  {metaBits.length > 0 && (
                    <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                      {metaBits.map((item) => (
                        <div
                          key={`${item.label}-${item.value}`}
                          className='rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-black/[0.04]'
                        >
                          <p className='text-[11px] font-medium text-[var(--muted)]'>
                            {item.label}
                          </p>
                          <p className='mt-0.5 text-[14px] font-semibold text-[var(--foreground)]'>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='px-5 py-6 sm:px-8 sm:py-8'>
                  <CommunityRichBody html={bodyHtml} />
                </div>

                <CommunityPostFooter
                  post={post}
                  boardId={boardId}
                  anonymous={anonymous}
                  isAuthor={isAuthor}
                  loginNext={`/nyc/${boardId}/${post.id}`}
                  onDelete={() => void handleDelete()}
                />
              </BoardSurface>
            </>
          )}

          <CommunityCommentsSection
            postId={post.id}
            boardId={boardId}
            anonymousBoard={anonymous}
            loginNext={`/nyc/${boardId}/${post.id}`}
          />
        </div>
      </BoardPageShell>
    </PullToRefresh>
  )
}
