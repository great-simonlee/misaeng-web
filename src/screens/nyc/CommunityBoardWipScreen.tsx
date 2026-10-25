'use client'

import Link from 'next/link'

import { useCity, useCityPath } from '@hooks/useCity'
import { getCity } from '@lib/constants/cities'
import { communityBoardKey, type NycCommunityBoardId } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
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
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const intro = t(communityBoardKey(boardId, 'listIntro'), {
    city: getCity(city).name,
  })
  // 문장 가운데 링크가 들어가서 {link} 앞뒤로 나눠 그린다
  const otherBoards = t('wip.otherBoards')
  const linkAt = otherBoards.indexOf('{link}')
  const [otherBefore, otherAfter] =
    linkAt < 0
      ? [`${otherBoards} `, '']
      : [otherBoards.slice(0, linkAt), otherBoards.slice(linkAt + '{link}'.length)]

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
          title={t('wip.title')}
          description={t('wip.description', { board: title })}
          actionHref={href()}
          actionLabel={t('wip.homeAction')}
        />
        <p className='mt-6 text-center text-[13px] text-[var(--muted)]'>
          {otherBefore}
          <Link href={href('/food')} className='font-semibold text-[var(--brand)]'>
            {t('categories.food.title')}
          </Link>
          {otherAfter}
        </p>
      </section>
    </BoardPageShell>
  )
}
