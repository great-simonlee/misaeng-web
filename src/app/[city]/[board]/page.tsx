import { notFound, redirect } from 'next/navigation'

import { isCityId } from '@lib/constants/cities'
import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityListScreen } from '@screens/nyc/CommunityListScreen'

interface CommunityBoardPageProps {
  params: Promise<{ city: string; board: string }>
}

export default async function CommunityBoardPage({
  params,
}: CommunityBoardPageProps) {
  const { city, board } = await params
  if (!isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(redirectTo)

  const category = getNycCategory(board)
  if (!category) notFound()

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={category.title} />
  }

  return <CommunityListScreen boardId={board} title={category.title} />
}
