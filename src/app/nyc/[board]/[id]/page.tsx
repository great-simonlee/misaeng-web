import { notFound } from 'next/navigation'

import {
  getNycCategory,
  isCommunityBoardId,
} from '@lib/constants/nyc'
import { CommunityDetailScreen } from '@screens/nyc/CommunityDetailScreen'

export const runtime = 'edge'

interface CommunityDetailPageProps {
  params: Promise<{ board: string; id: string }>
}

export default async function CommunityDetailPage({
  params,
}: CommunityDetailPageProps) {
  const { board, id } = await params
  if (!isCommunityBoardId(board)) notFound()
  const category = getNycCategory(board)
  if (!category) notFound()

  return (
    <CommunityDetailScreen
      boardId={board}
      title={category.title}
      postId={id}
    />
  )
}
