import { notFound, redirect } from 'next/navigation'

import {
  getCommunityBoardRedirect,
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
import { CommunityDetailScreen } from '@screens/nyc/CommunityDetailScreen'

interface CommunityDetailPageProps {
  params: Promise<{ board: string; id: string }>
}

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { board, id } = await params
  if (!isCommunityBoardId(board)) notFound()

  const redirectTo = getCommunityBoardRedirect(board)
  if (redirectTo) redirect(`${redirectTo}/${id}`)

  const category = getNycCategory(board)
  if (!category) notFound()

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={category.title} />
  }

  return (
    <CommunityDetailScreen
      boardId={board}
      title={category.title}
      postId={id}
    />
  )
}
