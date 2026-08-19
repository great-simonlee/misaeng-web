'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  NYC_COMMUNITY_BOARD_META,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { listCommunityPosts } from '@lib/firebase/community'
import type { CommunityPost } from '@/types/nyc'
import { CommunityPostCard } from '@widgets/nyc/CommunityPostCard'
import { EmptyState } from '@widgets/nyc/EmptyState'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState } from '@components'

interface CommunityListScreenProps {
  boardId: NycCommunityBoardId
  title: string
}

export function CommunityListScreen({
  boardId,
  title,
}: CommunityListScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user, loading: authLoading } = useAuth()
  const { error: toastError } = useToast()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const configured = isFirebaseConfigured()

  useEffect(() => {
    // 임시: 파이어베이스 커뮤니티 목록 조회 비활성화
    setLoading(false)
    /*
    if (!configured) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await listCommunityPosts(boardId)
        if (!cancelled) setPosts(data)
      } catch (err) {
        if (!cancelled) {
          const msg = getErrorMessage(err, '목록을 불러오지 못했어요')
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
    */
  }, [boardId])

  const newPath = `/nyc/${boardId}/new`
  const postHref = user ? newPath : `/nyc/login?next=${encodeURIComponent(newPath)}`

  return (
    <div className='min-h-screen min-w-0 bg-[var(--background)]'>
      <header className='mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8'>
        <p className='text-[10px] font-semibold tracking-[0.28em] text-[var(--muted)]'>
          <Link href='/nyc' className='hover:text-[#F64310]'>
            NYC
          </Link>{' '}
          / {title}
        </p>
        <div className='mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div className='min-w-0'>
            <h1 className='text-[1.65rem] font-bold tracking-tight text-[var(--foreground)] sm:text-4xl'>
              {title}
            </h1>
            <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)] sm:text-sm'>
              {meta.listIntro}
            </p>
          </div>
          {!authLoading && (
            <Link
              href={postHref}
              className='inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#F64310] px-5 text-sm font-semibold text-white touch-manipulation hover:bg-[#d93a0e] sm:w-auto sm:shrink-0'
            >
              {meta.writeLabel}
            </Link>
          )}
        </div>
        {/* 임시: 파이어베이스 배너 비활성화
        {!configured && (
          <div className='mt-5 sm:mt-6'>
            <FirebaseConfigBanner />
          </div>
        )}
        */}
      </header>

      <section className='mx-auto max-w-7xl border-t border-[var(--border)] px-4 py-6 sm:px-6 sm:py-10 lg:px-8'>
        {loading && <LoadingState className='py-8' label='글을 불러오는 중이에요…' />}
        {!loading && !error && posts.length === 0 && (
          <EmptyState
            title={`아직 ${title} 글이 없습니다`}
            description='첫 글을 올려 커뮤니티를 시작해 보세요.'
            actionHref={postHref}
            actionLabel={meta.writeLabel}
          />
        )}
        {!loading && posts.length > 0 && (
          <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2'>
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} boardId={boardId} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
