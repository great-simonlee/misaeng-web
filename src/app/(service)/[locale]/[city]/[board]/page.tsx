import type { Metadata } from 'next'
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
import { CommunityListScreen } from '@screens/nyc/CommunityListScreen'
import { pageMetadata, serviceLocale } from '@lib/seo/pageMetadata.server'

interface CommunityBoardPageProps {
  params: Promise<{ locale: string; city: string; board: string }>
}

export async function generateMetadata({ params }: CommunityBoardPageProps): Promise<Metadata> {
  const { locale, city, board } = await params
  const category = isCommunityBoardId(board) ? getNycCategory(board) : null
  if (!category || !isCityId(city)) return {}
  const t = await getT(serviceLocale(locale), 'community')
  return pageMetadata({
    locale,
    path: `/${city}${category.href}`,
    title: t(`categories.${category.id}.title`),
    description: t(`categories.${category.id}.description`, { city: city.toUpperCase() }),
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

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={title} />
  }

  const list = <CommunityListScreen boardId={board} title={title} />
  return isMemberOnlyBoard(board) ? <MemberGate>{list}</MemberGate> : list
}
