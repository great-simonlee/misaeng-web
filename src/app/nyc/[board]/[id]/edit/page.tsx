import { notFound, redirect } from 'next/navigation'

import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityNewScreen } from '@screens/nyc/CommunityNewScreen'

interface CommunityEditPageProps {
  params: Promise<{ board: string; id: string }>
}

export default async function CommunityEditPage({
  params,
}: CommunityEditPageProps) {
  const { board, id } = await params
  if (!isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board)
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
