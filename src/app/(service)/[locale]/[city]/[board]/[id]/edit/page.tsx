import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { isCityId } from '@lib/constants/cities'
import { isLocale } from '@lib/i18n/locales'
import { cityPageMetadata, metadataLocale, pageName } from '@lib/i18n/cityMetadata.server'
import { getT } from '@lib/i18n/server'
import { localePath } from '@lib/i18n/paths'
import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { MarketWriteScreen } from '@screens/nyc/MarketWriteScreen'
import { CommunityNewScreen } from '@screens/nyc/CommunityNewScreen'

interface CommunityEditPageProps {
  params: Promise<{ locale: string; city: string; board: string; id: string }>
}

export async function generateMetadata({ params }: CommunityEditPageProps): Promise<Metadata> {
  const { locale, city, board } = await params
  const category = isCommunityBoardId(board) ? getNycCategory(board) : null
  if (!category) return {}
  const t = await getT(metadataLocale(locale), 'community')
  const name = t(`categories.${category.id}.title`)
  return cityPageMetadata({ locale, city, page: await pageName(locale, 'edit', { board: name }), noindex: true })
}

export default async function CommunityEditPage({
  params,
}: CommunityEditPageProps) {
  const { locale, city, board, id } = await params
  if (!isLocale(locale) || !isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(localePath(locale, `${redirectTo}/${id}/edit`))

  const category = getNycCategory(board)
  if (!category) notFound()

  const t = await getT(locale, 'community')
  const title = t(`categories.${category.id}.title`)

  // 미생 중고거래: 웹에서도 물건을 올리고 고친다 (owner 11-23). Ellieo는 준비 중 그대로
  if (board === 'marketplace' && BRAND_CONFIG.id === 'misaeng') return <MarketWriteScreen editPostId={id} />

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={title} />
  }

  return (
    <CommunityNewScreen
      boardId={board}
      title={title}
      editPostId={id}
    />
  )
}
