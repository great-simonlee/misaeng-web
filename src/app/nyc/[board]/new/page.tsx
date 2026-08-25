import { notFound } from 'next/navigation'

import {
  getNycCategory,
  isCommunityBoardId,
  isCommunityBoardWip,
} from '@lib/constants/nyc'
import { CommunityBoardWipScreen } from '@screens/nyc/CommunityBoardWipScreen'
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

  if (isCommunityBoardWip(board)) {
    return <CommunityBoardWipScreen boardId={board} title={category.title} />
  }

  return <CommunityNewScreen boardId={board} title={category.title} />
}
