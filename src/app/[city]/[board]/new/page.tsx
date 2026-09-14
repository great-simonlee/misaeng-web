import { notFound, redirect } from 'next/navigation'

import { isCityId } from '@lib/constants/cities'
import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityNewScreen } from '@screens/nyc/CommunityNewScreen'

interface CommunityNewPageProps {
  params: Promise<{ city: string; board: string }>
}

export default async function CommunityNewPage({
  params,
}: CommunityNewPageProps) {
  const { city, board } = await params
  if (!isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(`${redirectTo}/new`)

  const category = getNycCategory(board)
  if (!category) notFound()

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={category.title} />
  }

  return <CommunityNewScreen boardId={board} title={category.title} />
}
