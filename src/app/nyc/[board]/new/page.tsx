import { notFound } from 'next/navigation'

import {
  getNycCategory,
  isCommunityBoardId,
} from '@lib/constants/nyc'
import { CommunityNewScreen } from '@screens/nyc/CommunityNewScreen'

interface CommunityNewPageProps {
  params: Promise<{ board: string }>
}

export default async function CommunityNewPage({
  params,
}: CommunityNewPageProps) {
  const { board } = await params
  if (!isCommunityBoardId(board)) notFound()
  const category = getNycCategory(board)
  if (!category) notFound()

  return <CommunityNewScreen boardId={board} title={category.title} />
}
