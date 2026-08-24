import { notFound } from 'next/navigation'

import {
  getNycCategory,
  isCommunityBoardId,
} from '@lib/constants/nyc'
import { CommunityNewScreen } from '@screens/nyc/CommunityNewScreen'

interface CommunityEditPageProps {
  params: Promise<{ board: string; id: string }>
}

export default async function CommunityEditPage({
  params,
}: CommunityEditPageProps) {
  const { board, id } = await params
  if (!isCommunityBoardId(board)) notFound()
  const category = getNycCategory(board)
  if (!category) notFound()

  return (
    <CommunityNewScreen
      boardId={board}
      title={category.title}
      editPostId={id}
    />
  )
}
