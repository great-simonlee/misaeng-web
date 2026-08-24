'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState, PullToRefresh, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  closeCommunityPostRequest,
  deleteCommunityPostRequest,
  fetchCommunityPost,
} from '@lib/community/client'
import { recordCommunityView } from '@lib/community/engagement.client'
import {
  formatCommunityCount,
  formatCommunityRelativeTime,
} from '@lib/constants/communityMock'
import {
  formatFoodPartySpend,
  formatFoodWait,
  formatUsd,
  resolveCommunityThumbnail,
} from '@lib/community/food'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import type { CommunityPost } from '@/types/nyc'
import { FoodCategoryBadge } from '@widgets/nyc/FoodCategoryBadge'
import {
  BoardBackLink,
  BoardMetaChip,
  BoardPageShell,
  BoardSurface,
  boardToneForId,
} from '@widgets/nyc/BoardPageShell'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityCommentsSection } from '@widgets/nyc/CommunityCommentsSection'
import { CommunityEngagementBar } from '@widgets/nyc/CommunityEngagementBar'
import { CopyLinkButton } from '@widgets/nyc/CopyLinkButton'
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

  async function handleClose() {
    if (!post || !user) return
    try {
      const next = await closeCommunityPostRequest(post.id)
      setPost(next)
      success('게시글을 마감했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '마감에 실패했어요'))
    }
  }

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
            description={error ?? '마감되었거나 삭제된 글일 수 있습니다.'}
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
  const bodyHtml = post.contentHtml || `<p>${post.description}</p>`
  const tone = boardToneForId(boardId)
  const foodSpend = formatFoodPartySpend(post.partySize, post.totalSpend)
  const foodWait = isFood ? formatFoodWait(post.waitMinutes) : null
  const thumbnail = isFood ? resolveCommunityThumbnail(post) : null
  const menuItems = isFood ? post.menuItems || [] : []
  const metaBits = [
    post.location && {
      label: meta.locationLabel,
      value: post.location,
    },
    !isFood &&
      post.detail &&
      meta.detailLabel && {
        label: meta.detailLabel,
        value:
          boardId === 'marketplace' ? `$${post.detail}` : post.detail,
      },
    isFood && post.detail
      ? { label: meta.detailLabel || '음식', value: post.detail }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <PullToRefresh onRefresh={refreshPost}>
      <BoardPageShell width='narrow'>
        <div className='pb-16 pt-5 sm:pb-20 sm:pt-7'>
          <BoardBackLink
            href={`/nyc/${boardId}`}
            label={`${title} 목록`}
            className='mb-4'
          />

          <BoardSurface as='article' className='overflow-hidden'>
            {thumbnail ? (
              <div className='relative aspect-[16/10] overflow-hidden bg-[#e8eaee] sm:aspect-[2/1]'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt=''
                  className='h-full w-full object-cover'
                />
              </div>
            ) : null}

            <div className='border-b border-black/[0.04] bg-gradient-to-b from-white to-[#fafbfc] px-5 py-5 sm:px-8 sm:py-7'>
              <div className='flex flex-wrap items-center gap-2'>
                <BoardMetaChip tone={tone}>{title}</BoardMetaChip>
                {isFood ? (
                  <FoodCategoryBadge
                    categoryId={post.foodCategory}
                    variant='soft'
                    size='md'
                  />
                ) : null}
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

              {isFood && (foodSpend || foodWait) ? (
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  {foodSpend ? (
                    <p className='inline-flex items-center rounded-full bg-[var(--brand-light)] px-3.5 py-1.5 text-[14px] font-semibold text-[var(--brand)]'>
                      {foodSpend}
                    </p>
                  ) : null}
                  {foodWait ? (
                    <p className='inline-flex items-center rounded-full bg-[#f4f5f7] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--foreground)]'>
                      {foodWait}
                    </p>
                  ) : null}
                </div>
              ) : null}

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

              {isFood &&
                (post.partySize ||
                  post.totalSpend != null ||
                  post.waitMinutes != null) && (
                  <div className='mt-4 flex flex-wrap gap-4 rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.04]'>
                    {post.partySize ? (
                      <div>
                        <p className='text-[11px] text-[var(--muted)]'>인원</p>
                        <p className='text-[15px] font-semibold tabular-nums'>
                          {post.partySize}인
                        </p>
                      </div>
                    ) : null}
                    {post.totalSpend != null ? (
                      <div>
                        <p className='text-[11px] text-[var(--muted)]'>
                          총 금액
                        </p>
                        <p className='text-[15px] font-semibold tabular-nums'>
                          ${formatUsd(post.totalSpend)}
                        </p>
                      </div>
                    ) : null}
                    {post.waitMinutes != null ? (
                      <div>
                        <p className='text-[11px] text-[var(--muted)]'>
                          웨이팅
                        </p>
                        <p className='text-[15px] font-semibold tabular-nums'>
                          {post.waitMinutes === 0
                            ? '없음'
                            : `${post.waitMinutes}분`}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
            </div>

            {menuItems.length > 0 && (
              <div className='border-b border-black/[0.04] px-5 py-6 sm:px-8'>
                <h2 className='text-[14px] font-semibold tracking-tight text-[var(--foreground)]'>
                  메뉴 후기
                </h2>
                <ul className='mt-4 space-y-4'>
                  {menuItems.map((item) => (
                    <li
                      key={item.id}
                      className='flex gap-3.5 sm:gap-4'
                    >
                      <div className='h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e8eaee] sm:h-28 sm:w-28'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt=''
                          className='h-full w-full object-cover'
                        />
                      </div>
                      <div className='min-w-0 flex-1 py-0.5'>
                        <p className='text-[14px] font-medium leading-relaxed text-[var(--foreground)] sm:text-[15px]'>
                          {item.caption || '메뉴 한 줄 평이 없어요'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className='px-5 py-6 sm:px-8 sm:py-8'>
              {isFood ? (
                <h2 className='mb-4 text-[14px] font-semibold tracking-tight text-[var(--foreground)]'>
                  자세한 후기
                </h2>
              ) : null}
              <CommunityRichBody html={bodyHtml} />
            </div>

            <div className='flex flex-col gap-4 border-t border-black/[0.04] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8'>
              <p className='text-[13px] text-[var(--muted)]'>
                {anonymous ? (
                  '익명 작성'
                ) : (
                  <>
                    작성자{' '}
                    <a
                      href={`mailto:${post.authorEmail}`}
                      className='font-medium text-[var(--foreground)] underline-offset-2 hover:underline'
                    >
                      {post.authorEmail}
                    </a>
                  </>
                )}
              </p>
              <CopyLinkButton />
            </div>

            <div className='border-t border-black/[0.04] px-5 py-4 sm:px-8'>
              <CommunityEngagementBar
                postId={post.id}
                boardId={boardId}
                loginNext={`/nyc/${boardId}/${post.id}`}
              />
            </div>
          </BoardSurface>

          {isAuthor && (
            <div className='mt-4 flex flex-wrap gap-2'>
              <Link
                href={`/nyc/${boardId}/${post.id}/edit`}
                className='inline-flex h-11 items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
              >
                수정
              </Link>
              <button
                type='button'
                onClick={() => void handleClose()}
                className='inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation transition hover:border-black/20'
              >
                게시 마감
              </button>
              <button
                type='button'
                onClick={() => void handleDelete()}
                className='inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-white px-5 text-[13px] font-medium text-red-600 touch-manipulation transition hover:bg-red-50'
              >
                삭제
              </button>
            </div>
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
