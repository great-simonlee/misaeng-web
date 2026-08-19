import { notFound } from 'next/navigation'

import {
  getNycCategory,
  isCommunityBoardId,
} from '@lib/constants/nyc'
import { CommunityListScreen } from '@screens/nyc/CommunityListScreen'

export const runtime = 'edge'

interface CommunityBoardPageProps {
  params: Promise<{ board: string }>
}

export default async function CommunityBoardPage({
  params,
}: CommunityBoardPageProps) {
  const { board } = await params
  if (!isCommunityBoardId(board)) notFound()
  const category = getNycCategory(board)
  if (!category) notFound()

  return <CommunityListScreen boardId={board} title={category.title} />
}
