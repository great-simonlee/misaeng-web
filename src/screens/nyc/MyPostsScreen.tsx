'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingState, SchoolBadge } from '@components'
import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  deleteCommunityPostRequest,
  fetchMyCommunityPosts,
} from '@lib/community/client'
import {
  getNycCategory,
  NYC_CATEGORIES,
  NYC_COMMUNITY_BOARD_IDS,
  NYC_PAGE_SHELL_CLASS,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
import { cn } from '@lib'
import type { CommunityPost } from '@/types/nyc'
import {
  AccountCategoryChip,
  AccountCategorySideItem,
} from '@widgets/nyc/AccountCategoryNav'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'

type MyPostsCommunityCategory = Extract<
  (typeof NYC_CATEGORIES)[number],
  { id: NycCommunityBoardId }
>

const MY_POSTS_COMMUNITY_CATEGORIES = NYC_CATEGORIES.filter(
  (category): category is MyPostsCommunityCategory =>
    (NYC_COMMUNITY_BOARD_IDS as readonly string[]).includes(category.id),
)

type MyPostItem = {
  id: string
  title: string
  meta: string
  href: string
  editHref: string | null
  categoryId: NycCommunityBoardId
  boardLabel: string
  authorSchoolId: string | null
  status: 'open' | 'closed'
  canManage: boolean
}

type CategoryFilter = 'all' | NycCommunityBoardId

export function MyPostsScreen() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { error: toastError, success } = useToast()
  const [posts, setPosts] = useState<MyPostItem[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/nyc/login?next=${encodeURIComponent('/nyc/me/posts')}`)
    }
  }, [user, loading, router])

  const loadPosts = useCallback(async () => {
    if (!user) {
      setLoadingPosts(false)
      return
    }
    setLoadingPosts(true)
    try {
      const community = await fetchMyCommunityPosts()
      setPosts(mapCommunity(community))
    } catch (err) {
      toastError(getErrorMessage(err, '내 글을 불러오지 못했어요'))
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }, [user, toastError])

  useEffect(() => {
    if (loading || !user) return
    void loadPosts()
  }, [loading, user, loadPosts])

  async function handleDelete(post: MyPostItem) {
    if (!post.canManage) return
    const ok = window.confirm(
      `"${post.title}" 글을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`,
    )
    if (!ok) return
    setDeletingId(post.id)
    try {
      await deleteCommunityPostRequest(post.id)
      setPosts((prev) => prev.filter((item) => item.id !== post.id))
      success('글을 삭제했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '삭제에 실패했어요'))
    } finally {
      setDeletingId(null)
    }
  }

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      MY_POSTS_COMMUNITY_CATEGORIES.map((category) => [category.id, 0]),
    ) as Record<NycCommunityBoardId, number>
    for (const post of posts) {
      map[post.categoryId] = (map[post.categoryId] ?? 0) + 1
    }
    return map
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (category === 'all') return posts
    return posts.filter((post) => post.categoryId === category)
  }, [posts, category])

  const sortedBoards = useMemo(() => {
    return [...MY_POSTS_COMMUNITY_CATEGORIES].sort((a, b) => {
      const diff = counts[b.id] - counts[a.id]
      if (diff !== 0) return diff
      return (
        MY_POSTS_COMMUNITY_CATEGORIES.findIndex((c) => c.id === a.id) -
        MY_POSTS_COMMUNITY_CATEGORIES.findIndex((c) => c.id === b.id)
      )
    })
  }, [counts])

  const selectedBoard =
    category === 'all'
      ? null
      : MY_POSTS_COMMUNITY_CATEGORIES.find((c) => c.id === category) ?? null

  if (loading) {
    return <LoadingState fullPage />
  }

  if (!user) {
    return <LoadingState fullPage label='로그인 페이지로 이동 중…' />
  }

  return (
    <div className='relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]'>
      <div
        className={cn(
          'flex flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12',
          NYC_PAGE_SHELL_CLASS,
        )}
      >
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium tracking-[0.18em] text-[var(--muted)]'>
              ACCOUNT
            </p>
            <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] lg:text-[1.75rem]'>
              내가 올린 글
            </h1>
            <p className='mt-1.5 text-[14px] text-[var(--muted-foreground)]'>
              커뮤니티 게시판 글을 카테고리별로 모아 보고, 수정·삭제할 수 있어요
            </p>
          </div>
          <span className='rounded-full bg-white px-3 py-1.5 text-[13px] tabular-nums text-[var(--muted)] ring-1 ring-black/[0.06]'>
            {loadingPosts
              ? '…'
              : category === 'all'
                ? `전체 ${posts.length}`
                : `${filteredPosts.length}개`}
          </span>
        </div>

        <div className='mt-8 grid flex-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch lg:gap-8'>
          <aside className='hidden lg:block'>
            <div className='sticky top-24 overflow-hidden rounded-[1.25rem] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
              <p className='px-3 pb-2 pt-2.5 text-[11px] font-medium tracking-[0.14em] text-[var(--muted)]'>
                카테고리
              </p>
              <nav className='flex flex-col gap-0.5' aria-label='글 카테고리'>
                <AccountCategorySideItem
                  label='전체'
                  count={posts.length}
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                />
                {sortedBoards.map((board) => (
                  <AccountCategorySideItem
                    key={board.id}
                    label={board.title}
                    count={counts[board.id]}
                    active={category === board.id}
                    onClick={() => setCategory(board.id)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            {!loadingPosts && (
              <div className='mb-5 shrink-0 lg:hidden'>
                <ChipScrollRow
                  ariaLabel='글 카테고리'
                  leading={
                    <AccountCategoryChip
                      variant='lead'
                      label='전체'
                      active={category === 'all'}
                      count={posts.length}
                      onClick={() => setCategory('all')}
                    />
                  }
                >
                  {sortedBoards.map((board) => (
                    <AccountCategoryChip
                      key={board.id}
                      label={board.title}
                      active={category === board.id}
                      count={counts[board.id]}
                      onClick={() => setCategory(board.id)}
                    />
                  ))}
                </ChipScrollRow>
              </div>
            )}

            {loadingPosts ? (
              <LoadingState
                className='flex-1 py-16'
                label='글을 불러오는 중이에요…'
              />
            ) : filteredPosts.length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center rounded-[1.25rem] bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] lg:py-20'>
                <p className='text-[15px] font-semibold tracking-tight text-[var(--foreground)] lg:text-base'>
                  {category === 'all'
                    ? '아직 올린 글이 없어요'
                    : `${selectedBoard?.title ?? '이 카테고리'}에 올린 글이 없어요`}
                </p>
                <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                  {category === 'all'
                    ? '각 게시판에서 글을 올리면 여기에 모여요'
                    : '해당 게시판에서 글을 올리면 여기에 보여요'}
                </p>
                <Link
                  href={selectedBoard?.href ?? '/nyc'}
                  className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
                >
                  {selectedBoard
                    ? `${selectedBoard.title} 게시판 보기`
                    : '게시판 둘러보기'}
                </Link>
              </div>
            ) : (
              <ul className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
                {filteredPosts.map((post, index) => (
                  <li
                    key={`${post.href}-${post.id}`}
                    className={cn(
                      index !== filteredPosts.length - 1 &&
                        'border-b border-[#f0f1f3]',
                    )}
                  >
                    <div className='flex items-start gap-3 px-5 py-4 lg:gap-4 lg:px-6 lg:py-5'>
                      <Link
                        href={post.href}
                        className='min-w-0 flex-1 touch-manipulation transition hover:opacity-80'
                      >
                        <div className='flex flex-wrap items-center gap-1.5'>
                          {category === 'all' && (
                            <span className='text-[11px] font-medium tracking-wide text-[var(--brand)]'>
                              {post.boardLabel}
                            </span>
                          )}
                          {post.status === 'closed' && (
                            <span className='rounded-full bg-[#f1f2f4] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]'>
                              마감
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            'flex flex-wrap items-center gap-1.5',
                            category === 'all' || post.status === 'closed'
                              ? 'mt-1'
                              : undefined,
                          )}
                        >
                          <p className='truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)] lg:text-base'>
                            {post.title}
                          </p>
                          <SchoolBadge schoolId={post.authorSchoolId} />
                        </div>
                        <p className='mt-0.5 truncate text-[12px] text-[var(--muted)] lg:text-[13px]'>
                          {post.meta}
                        </p>
                      </Link>

                      {post.canManage ? (
                        <div className='flex shrink-0 items-center gap-1.5 pt-0.5'>
                          {post.editHref && post.status === 'open' ? (
                            <Link
                              href={post.editHref}
                              className='inline-flex h-8 items-center rounded-full bg-[#f3f4f6] px-3 text-[12px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#e8eaee]'
                            >
                              수정
                            </Link>
                          ) : null}
                          <button
                            type='button'
                            disabled={deletingId === post.id}
                            onClick={() => void handleDelete(post)}
                            className='inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold text-red-600 touch-manipulation transition hover:bg-red-50 disabled:opacity-50'
                          >
                            {deletingId === post.id ? '삭제 중…' : '삭제'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function mapCommunity(posts: CommunityPost[]): MyPostItem[] {
  return posts.map((post) => {
    const category = getNycCategory(post.categoryId)
    const categoryId = (category?.id ?? post.categoryId) as NycCommunityBoardId
    const isMock = post.id.startsWith('mock-')
    return {
      id: post.id,
      title: post.title,
      meta:
        [post.location, post.detail].filter(Boolean).join(' · ') || '상세 보기',
      href: `/nyc/${post.categoryId}/${post.id}`,
      editHref: isMock
        ? null
        : `/nyc/${post.categoryId}/${post.id}/edit`,
      categoryId,
      boardLabel: category?.title ?? post.categoryId,
      authorSchoolId: post.authorSchoolId,
      status: post.status === 'closed' ? 'closed' : 'open',
      canManage: !isMock,
    }
  })
}
