import { notFound, redirect } from 'next/navigation'

import { MemberGate } from '@components/MemberGate'
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
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityDetailScreen } from '@screens/nyc/CommunityDetailScreen'

interface CommunityDetailPageProps {
  params: Promise<{ locale: string; city: string; board: string; id: string }>
}

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
  return isMemberOnlyBoard(board) ? <MemberGate>{detail}</MemberGate> : detail
}
