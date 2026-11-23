import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { MemberGate } from '@components/MemberGate'
import { BRAND_CONFIG } from '@lib/brand'
import { isCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { cityName, cityPageMetadata, metadataLocale } from '@lib/i18n/cityMetadata.server'
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
import { CommunityListScreen } from '@screens/nyc/CommunityListScreen'

interface CommunityBoardPageProps {
  params: Promise<{ locale: string; city: string; board: string }>
}

export async function generateMetadata({ params }: CommunityBoardPageProps): Promise<Metadata> {
  const { locale, city, board } = await params
  const category = isCommunityBoardId(board) ? getNycCategory(board) : null
  if (!category) return {}
  const t = await getT(metadataLocale(locale), 'community')
  const name = t(`categories.${category.id}.title`)
  return cityPageMetadata({
    locale,
    city,
    page: name,
    description: t(`categories.${category.id}.description`, { city: await cityName(locale, city) }),
  })
}

export default async function CommunityBoardPage({
  params,
}: CommunityBoardPageProps) {
  const { locale, city, board } = await params
  if (!isLocale(locale) || !isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(localePath(locale, redirectTo))

  const category = getNycCategory(board)
  if (!category) notFound()

  const t = await getT(locale, 'community')
  const title = t(`categories.${category.id}.title`)

  // 미생: 중고거래 목록·상세는 웹에서도 보여 준다 (쓰기·수정만 준비 중 화면). Ellieo는 그대로 준비 중
  if (isCommunityBoardWip(board) && (board !== 'marketplace' || BRAND_CONFIG.id !== 'misaeng')) {
    return <CommunityBoardWipScreen boardId={board} title={title} />
  }

  const list = <CommunityListScreen boardId={board} title={title} />
  return isMemberOnlyBoard(board) ? <MemberGate>{list}</MemberGate> : list
}
