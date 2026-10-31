'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState, PullToRefresh, AuthorBadges } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  communityPostMatchesCity,
  hrefForCommunityPost,
  isSharedCommunityBoard,
} from '@lib/constants/cities'
import {
  CommunityBlockedPostError,
  deleteCommunityPostRequest,
  postDeleteConfirmText,
  fetchCommunityPost,
  localizeCommunityError,
} from '@lib/community/client'
import { recordCommunityView } from '@lib/community/engagement.client'
import {
  NYC_COMMUNITY_BOARD_META,
  communityBoardKey,
  isAnonymousBoard,
  isStatusCommunityBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import {
  BoardBackLink,
  BoardMetaChip,
  BoardPageShell,
  BoardSurface,
  boardToneForId,
} from '@widgets/nyc/BoardPageShell'
import { EllieoSideRail } from '@widgets/ellieo/EllieoRail'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { CommunityCommentsSection } from '@widgets/nyc/CommunityCommentsSection'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { useCommunityFormat } from '@widgets/nyc/CommunityPostCard'
import { TranslationNotice, useTranslatedContent } from '@widgets/TranslationNotice'
import { FoodDetailContent } from '@widgets/nyc/FoodDetailContent'
import { CptOptDetailContent } from '@widgets/nyc/CptOptDetailContent'
import { JobReviewDetailContent } from '@widgets/nyc/JobReviewDetailContent'
import { RoommateDetailContent } from '@widgets/nyc/RoommateDetailContent'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { ReviewVerificationEntry } from '@widgets/nyc/reviewDocs/ReviewVerificationEntry'

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
  const t = useT('community')
  const tRoot = useT()
  const format = useCommunityFormat()
  const city = useCity()
  const href = useCityPath()
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user } = useAuth()
  const { error: toastError, success } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  // 회사 페이지에서 들어왔으면 뒤로가기를 그 회사 페이지로
  const fromCompany = parseFromCompany(
    searchParams.get('company'),
    searchParams.get('companyName'),
    t('detail.companyPageFallback'),
  )
  const [storedPost, setPost] = useState<CommunityPost | null>(null)
  // 번역된 글이면 "원문 보기"로 원문과 번역을 오간다
  const translated = useTranslatedContent<CommunityPost, CommunityPost | null>(storedPost, 'post')
  const post = translated.item
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 내가 차단한 사용자의 글
  const [blocked, setBlocked] = useState(false)

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
        setBlocked(false)
      } catch (err) {
        if (err instanceof CommunityBlockedPostError) {
          setPost(null)
          setError(null)
          setBlocked(true)
          return
        }
        const msg = getErrorMessage(
          localizeCommunityError(err, t),
          t('detail.loadFailed'),
        )
        setError(msg)
        if (!opts?.silent) toastError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [postId, t, toastError],
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
    const message = await postDeleteConfirmText(post.id, t('detail.deleteConfirm', { title: post.title }), tRoot)
    if (!window.confirm(message)) return
    try {
      await deleteCommunityPostRequest(post.id)
      success(t('detail.deleted'))
      router.push(href('/me/posts'))
    } catch (err) {
      toastError(
        getErrorMessage(
          localizeCommunityError(err, t),
          t('errors.deleteFailed'),
        ),
      )
    }
  }

  // 면접·취업 후기는 회사 페이지와 같은 넓은 폭
  const shellWidth = boardId === 'job-review' ? 'wide' : 'narrow'

  if (loading) {
    return (
      <PullToRefresh onRefresh={refreshPost}>
        <BoardPageShell width={shellWidth}>
          <LoadingState fullPage label={t('detail.loading')} />
        </BoardPageShell>
      </PullToRefresh>
    )
  }

  if (blocked) {
    return (
      <PullToRefresh onRefresh={refreshPost}>
        <BoardPageShell width={shellWidth} className='py-12'>
          <EmptyState
            title={t('blocks.blockedPostTitle')}
            description={t('blocks.blockedPostDescription')}
            actionHref={href(`/${boardId}`)}
            actionLabel={t('detail.backToListAction', { board: title })}
          />
        </BoardPageShell>
      </PullToRefresh>
    )
  }

  const boardMatch = isStatusCommunityBoard(boardId)
    ? isStatusCommunityBoard(post?.categoryId ?? '')
    : post?.categoryId === boardId
  const cityMatch =
    !post ||
    isSharedCommunityBoard(post.categoryId) ||
    communityPostMatchesCity(post, city)

  if (
    error ||
    !post ||
    post.status === 'closed' ||
    !boardMatch ||
    !cityMatch
  ) {
    return (
      <PullToRefresh onRefresh={refreshPost}>
        <BoardPageShell width={shellWidth} className='py-12'>
          <EmptyState
            title={t('detail.notFoundTitle')}
            description={error ?? t('detail.notFoundDescription')}
            actionHref={href(`/${boardId}`)}
            actionLabel={t('detail.backToListAction', { board: title })}
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
  const translationNotice = (
    <TranslationNotice
      i18n={post.i18n}
      showingOriginal={translated.showingOriginal}
      onToggle={translated.toggle}
    />
  )
  const tone = boardToneForId(boardId)
  const metaBits = [
    post.location && {
      label: t(communityBoardKey(boardId, 'locationLabel')),
      value: post.location,
    },
    post.detail &&
      meta.hasDetail && {
        label: t(communityBoardKey(boardId, 'detailLabel')),
        value:
          boardId === 'marketplace' ? `$${post.detail}` : post.detail,
      },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <PullToRefresh onRefresh={refreshPost}>
      <BoardPageShell
        width={shellWidth}
        aside={BRAND_CONFIG.theme === 'ellieo' && shellWidth === 'narrow' ? <EllieoSideRail /> : undefined}
      >
        <div
          className={
            isFood
              ? 'pb-16 pt-0 sm:pb-20 sm:pt-6 lg:pt-8'
              : isCptOpt || isJobReview
                ? 'pb-16 pt-4 sm:pb-20 sm:pt-6 lg:pt-8'
                : 'pb-16 pt-5 sm:pb-20 sm:pt-7'
          }
        >
          {/* 맛집은 히어로 위 뒤로가기가 있어 상단 링크는 생략 */}
          {!isFood ? (
            <BoardBackLink
              href={
                fromCompany
                  ? href(`/companies/${fromCompany.slug}`)
                  : href(`/${boardId}`)
              }
              label={
                fromCompany
                  ? fromCompany.name
                  : t('detail.backToList', { board: title })
              }
              className={isCptOpt || isJobReview ? 'mb-4 px-1 sm:px-0' : 'mb-4'}
            />
          ) : null}

          {isFood ? (
            <FoodDetailContent
              post={post}
              translationNotice={translationNotice}
              contentLang={translated.lang}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : isCptOpt ? (
            <CptOptDetailContent
              post={post}
              translationNotice={translationNotice}
              contentLang={translated.lang}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : isJobReview ? (
            <JobReviewDetailContent
              post={post}
              translationNotice={translationNotice}
              contentLang={translated.lang}
              boardId={boardId}
              boardTitle={title}
              isAuthor={isAuthor}
              onDelete={() => void handleDelete()}
            />
          ) : isRoommate ? (
            <RoommateDetailContent
              post={post}
              translationNotice={
                post.i18n && post.i18n.state !== 'original' ? translationNotice : null
              }
              contentLang={translated.lang}
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
                      <BoardMetaChip>{t('author.anonymous')}</BoardMetaChip>
                    ) : (
                      <AuthorBadges schoolId={post.authorSchoolId} workplaceVerified={post.authorWorkplaceVerified} instagramVerified={post.authorInstagramVerified} />
                    )}
                    <span className='text-[12px] text-[var(--muted)]'>
                      {format.relativeTime(post.createdAt)}
                    </span>
                    <span className='text-[12px] text-[var(--muted)]'>
                      {t('detail.views', { n: format.count(post.viewCount) })}
                    </span>
                  </div>

                  <h1
                    lang={translated.lang}
                    className='mt-3.5 text-[1.55rem] font-semibold leading-[1.25] tracking-[-0.035em] text-[var(--foreground)] sm:text-[1.9rem]'
                  >
                    {post.title}
                  </h1>
                  {post.i18n && post.i18n.state !== 'original' ? (
                    <div className='mt-1.5'>{translationNotice}</div>
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
                </div>

                <div lang={translated.lang} className='px-5 py-6 sm:px-8 sm:py-8'>
                  <CommunityRichBody html={bodyHtml} />
                </div>

                <CommunityPostFooter
                  post={post}
                  boardId={boardId}
                  anonymous={anonymous}
                  isAuthor={isAuthor}
                  loginNext={hrefForCommunityPost(post, city)}
                  onDelete={() => void handleDelete()}
                />
              </BoardSurface>
            </>
          )}

          {isAuthor && (isCptOpt || isJobReview) ? (
            <ReviewVerificationEntry postId={post.id} className='mt-4' />
          ) : null}

          <CommunityCommentsSection
            postId={post.id}
            boardId={boardId}
            anonymousBoard={anonymous}
            loginNext={hrefForCommunityPost(post, city)}
          />
        </div>
      </BoardPageShell>
    </PullToRefresh>
  )
}

function parseFromCompany(
  slug: string | null,
  name: string | null,
  fallbackName: string,
) {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null
  return { slug, name: name?.trim() || fallbackName }
}
