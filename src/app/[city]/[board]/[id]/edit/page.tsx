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

interface CommunityEditPageProps {
  params: Promise<{ city: string; board: string; id: string }>
}

export default async function CommunityEditPage({
  params,
}: CommunityEditPageProps) {
  const { city, board, id } = await params
  if (!isCityId(city) || !isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board, city)
  if (redirectTo) redirect(`${redirectTo}/${id}/edit`)

  const category = getNycCategory(board)
  if (!category) notFound()

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={category.title} />
  }

  return (
    <CommunityNewScreen
      boardId={board}
      title={category.title}
      editPostId={id}
    />
  )
}
