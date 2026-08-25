import Link from 'next/link'

import { NYC_COMMUNITY_BOARD_META, type NycCommunityBoardId } from '@lib/constants/nyc'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { EmptyState } from '@widgets/nyc/EmptyState'

interface CommunityBoardWipScreenProps {
  boardId: NycCommunityBoardId
  title: string
}

export function CommunityBoardWipScreen({
  boardId,
  title,
}: CommunityBoardWipScreenProps) {
  const intro = NYC_COMMUNITY_BOARD_META[boardId]?.listIntro

  return (
    <BoardPageShell>
      <header className='pt-5 sm:pt-8 lg:pt-10'>
        <h1 className='text-[1.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem] lg:text-[2rem]'>
          {title}
        </h1>
        {intro ? (
          <p className='mt-3 max-w-2xl text-[13px] leading-[1.45] text-[var(--muted)] sm:mt-3.5 sm:text-[14px] sm:leading-relaxed lg:text-[15px]'>
            {intro}
          </p>
        ) : null}
      </header>

      <section className='pb-14 pt-6 sm:pb-16 sm:pt-8'>
        <EmptyState
          title='준비 중이에요'
          description={`${title} 게시판은 지금 만들고 있어요. 조금만 기다려 주세요.`}
          actionHref='/nyc'
          actionLabel='커뮤니티 홈으로'
        />
        <p className='mt-6 text-center text-[13px] text-[var(--muted)]'>
          다른 게시판이 궁금하시면{' '}
          <Link href='/nyc/food' className='font-semibold text-[var(--brand)]'>
            맛집
          </Link>
          을 먼저 둘러보세요.
        </p>
      </section>
    </BoardPageShell>
  )
}
