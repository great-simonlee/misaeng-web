'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import {
//   closeCommunityPost,
//   getCommunityPost,
// } from '@lib/firebase/community'
import type { CommunityPost } from '@/types/nyc'
import { CopyLinkButton } from '@widgets/nyc/CopyLinkButton'
import { EmptyState } from '@widgets/nyc/EmptyState'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState, SchoolBadge } from '@components'

interface CommunityDetailScreenProps {
  boardId: NycCommunityBoardId
  title: string
  postId: string
}

export function CommunityDetailScreen({
  boardId,
  title,
}: CommunityDetailScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user } = useAuth()
  const { error: toastError } = useToast()
  const [post] = useState<CommunityPost | null>(null)
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)
  // const configured = isFirebaseConfigured()

  // 임시: 파이어베이스 커뮤니티 상세 조회 비활성화
  /*
  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCommunityPost(postId)
        if (!cancelled) setPost(data)
      } catch (err) {
        if (!cancelled) {
          const msg = getErrorMessage(err, '글을 불러오지 못했어요')
          setError(msg)
          toastError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [postId])
  */

  async function handleClose() {
    if (!post || !user) return
    // 임시: 파이어베이스 마감 비활성화
    toastError('Supabase 연동 후 이용할 수 있어요')
    /*
    try {
      await closeCommunityPost(post.id)
      setPost({ ...post, status: 'closed' })
      success('게시글을 마감했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '마감에 실패했어요'))
    }
    */
  }

  // 임시: 파이어베이스 배너 비활성화
  /*
  if (!configured) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12'>
        <FirebaseConfigBanner />
      </div>
    )
  }
  */

  if (loading) {
    return <LoadingState fullPage />
  }

  if (
    error ||
    !post ||
    post.status === 'closed' ||
    post.categoryId !== boardId
  ) {
    return (
      <div className='mx-auto max-w-3xl px-4 py-12'>
        <EmptyState
          title='게시글을 찾을 수 없습니다'
          description={error ?? '마감되었거나 삭제된 글일 수 있습니다.'}
          actionHref={`/nyc/${boardId}`}
          actionLabel={`${title} 목록으로`}
        />
      </div>
    )
  }

  const isAuthor = user?.uid === post.authorUid
  const anonymous = isAnonymousBoard(boardId)

  return (
    <div className='min-h-screen bg-[var(--background)]'>
      <article className='mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-12'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          <Link href={`/nyc/${boardId}`} className='hover:text-[#F64310]'>
            {title}
          </Link>
        </p>
        <div className='mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-[1.5rem] font-bold leading-snug tracking-tight text-[var(--foreground)] sm:text-4xl'>
                {post.title}
              </h1>
              {anonymous ? (
                <span className='rounded-full bg-[var(--foreground)]/6 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[var(--muted)]'>
                  익명
                </span>
              ) : (
                <SchoolBadge schoolId={post.authorSchoolId} />
              )}
            </div>
            {(post.location || post.detail) && (
              <p className='mt-2 text-[15px] font-semibold leading-snug text-[var(--foreground)] sm:text-base'>
                {[post.location, post.detail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className='w-full shrink-0 sm:w-auto'>
            <CopyLinkButton />
          </div>
        </div>

        <div className='mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:mt-8 sm:p-6'>
          <p className='whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--muted-foreground)] sm:text-sm'>
            {post.description}
          </p>
          <dl className='grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-2 sm:gap-3'>
            {post.location && (
              <div>
                <dt className='text-[var(--muted)]'>{meta.locationLabel}</dt>
                <dd className='mt-0.5 font-medium text-[var(--foreground)]'>
                  {post.location}
                </dd>
              </div>
            )}
            {post.detail && meta.detailLabel && (
              <div>
                <dt className='text-[var(--muted)]'>{meta.detailLabel}</dt>
                <dd className='mt-0.5 font-medium text-[var(--foreground)]'>
                  {post.detail}
                </dd>
              </div>
            )}
            <div>
              <dt className='text-[var(--muted)]'>작성자</dt>
              <dd className='mt-0.5 break-all font-medium text-[var(--foreground)]'>
                {anonymous ? (
                  '익명'
                ) : (
                  <a
                    href={`mailto:${post.authorEmail}`}
                    className='inline-flex min-h-[44px] items-center text-[#F64310] underline-offset-2 touch-manipulation hover:underline'
                  >
                    {post.authorEmail}
                  </a>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {isAuthor && (
          <button
            type='button'
            onClick={() => void handleClose()}
            className='mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted-foreground)] touch-manipulation hover:border-red-300 hover:text-red-600 sm:w-auto'
          >
            게시 마감
          </button>
        )}
      </article>
    </div>
  )
}
