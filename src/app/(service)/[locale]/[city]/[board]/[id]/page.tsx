import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { MemberGate } from '@components/MemberGate'
import { OpenInApp } from '@components/OpenInApp'
import { isCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { localePath } from '@lib/i18n/paths'
import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
  isMemberOnlyBoard,
} from '@lib/constants/nyc'
import { shareMetadata } from '@lib/share/shareMetadata'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityDetailScreen } from '@screens/nyc/CommunityDetailScreen'

interface CommunityDetailPageProps {
  params: Promise<{ locale: string; city: string; board: string; id: string }>
}

// 회원 전용 게시판(비자·면접/취업 후기)을 공유한 링크: "미생에서 … 공유했어요" 제목 + 통일 이미지, 본문은 넣지 않는다.
export async function generateMetadata({ params }: CommunityDetailPageProps): Promise<Metadata> {
  const { locale, city, board, id } = await params
  if (!isCommunityBoardId(board) || !isMemberOnlyBoard(board)) return {}
  return shareMetadata(board === 'job-review' ? 'review' : 'visa', locale, {
    path: `/${city}/${board}/${id}`,
    memberOnly: true,
  })
}

/** Boards the app opens by id */
const APP_BOARDS = new Set(['review', 'status', 'food', 'anonymous', 'roommate'])

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { locale, city, board, id } = await params
  if (!isLocale(locale) || !isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(localePath(locale, `${redirectTo}/${id}`))

  const category = getNycCategory(board)
  if (!category) notFound()

  const t = await getT(locale, 'community')
  const title = t(`categories.${category.id}.title`)

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={title} />
  }

  const detail = <CommunityDetailScreen boardId={board} title={title} postId={id} />
  // Same screen in the app (misaeng-app AppRouter: review/, status/, food/, anonymous/, roommate/)
  const appBoard = board === 'job-review' ? 'review' : isMemberOnlyBoard(board) ? 'status' : board
  const openInApp = APP_BOARDS.has(appBoard) ? <OpenInApp appPath={`${appBoard}/${id}`} /> : null
  if (!isMemberOnlyBoard(board)) {
    return (
      <>
        {openInApp}
        {detail}
      </>
    )
  }
  return (
    <>
      {openInApp}
      <MemberGate>{detail}</MemberGate>
    </>
  )
}
