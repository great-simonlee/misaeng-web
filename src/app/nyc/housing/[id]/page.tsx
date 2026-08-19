import { Suspense } from 'react'

import { LoadingState } from '@components'
import { HousingDetailScreen } from '@screens/nyc/HousingDetailScreen'

interface HousingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function HousingDetailPage({
  params,
}: HousingDetailPageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<LoadingState fullPage />}>
      <HousingDetailScreen postId={id} />
    </Suspense>
  )
}
