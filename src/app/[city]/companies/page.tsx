import type { Metadata } from 'next'

import { companyCopy } from '@lib/constants/companyCopy'
import { CompanyListScreen } from '@screens/nyc/CompanyListScreen'

export const metadata: Metadata = {
  description: companyCopy.metaListDescription,
}

export default function CompaniesPage() {
  return <CompanyListScreen />
}
