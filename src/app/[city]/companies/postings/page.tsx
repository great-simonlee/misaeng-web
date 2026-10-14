import type { Metadata } from 'next'

import { postingCopy } from '@lib/constants/postingCopy'
import { PostingListScreen } from '@screens/nyc/PostingListScreen'

export const metadata: Metadata = {
  description: postingCopy.metaDescription,
}

export default function PostingsPage() {
  return <PostingListScreen />
}
