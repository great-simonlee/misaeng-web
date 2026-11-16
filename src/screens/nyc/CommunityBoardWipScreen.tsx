'use client'

import Link from 'next/link'

import { useCity, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { getCity } from '@lib/constants/cities'
import { communityBoardKey, type NycCommunityBoardId } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import { boardIcon } from '@widgets/ellieo/nav'

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

  if (BRAND_CONFIG.theme === 'ellieo') {
    // Ellieo: one big "coming soon" card with the board emoji, then a way back into the boards that are open
    return (
      <BoardPageShell>
        <section className='pb-14 pt-6'>
          <div className='flex flex-col items-center rounded-[1.75rem] bg-[var(--surface)] px-6 py-12 text-center'>
            <EllieoIconBadge icon={boardIcon(boardId)} />
            <span className='mt-5 rounded-full bg-[var(--ellieo-lime)] px-3 py-1 text-[12px] font-bold text-[var(--foreground)]'>
              {t('wip.title')}
            </span>
            <h1 className='mt-3 text-[1.75rem] font-extrabold tracking-[-0.03em] text-[var(--foreground)]'>{title}</h1>
            {intro ? <p className='mt-2 max-w-[26rem] text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{intro}</p> : null}
            <p className='mt-3 max-w-[26rem] text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
              {t('wip.description', { board: title })}
            </p>
            <div className='mt-6 flex flex-wrap justify-center gap-2'>
              <Link
                href={href()}
                className='inline-flex h-12 items-center rounded-full bg-[var(--brand)] px-6 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
              >
                {t('wip.homeAction')}
              </Link>
              <Link
                href={href('/food')}
                className='inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-bold text-[var(--foreground)] transition hover:bg-[var(--border)]'
              >
                {t('categories.food.title')}
              </Link>
            </div>
          </div>
        </section>
      </BoardPageShell>
    )
  }

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
