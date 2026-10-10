import type { Metadata } from 'next'

import { companyCopy } from '@lib/constants/companyCopy'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { CompanyDetailScreen } from '@screens/nyc/CompanyDetailScreen'

interface CompanyPageProps {
  params: Promise<{ city: string; slug: string }>
}

// 탭 제목은 모든 페이지에서 사이트 기본값 그대로 둔다 (src/app/layout.tsx).
// 검색엔진용 설명에는 회사명만 쓰고, 후기 본문은 넣지 않는다.
export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { slug } = await params
  const company = await getActiveCompanyBySlug(slug).catch(() => null)
  if (!company) return { description: companyCopy.metaListDescription }
  return {
    description: companyCopy.metaCompanyDescription(company.name),
  }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  return <CompanyDetailScreen slug={slug} />
}
