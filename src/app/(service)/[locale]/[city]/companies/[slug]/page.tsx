import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { CompanyDetailScreen } from '@screens/nyc/CompanyDetailScreen'

interface CompanyPageProps {
  params: Promise<{ locale: string; city: string; slug: string }>
}

// 탭 제목은 모든 페이지에서 사이트 기본값 그대로 둔다 (src/app/layout.tsx).
// 검색엔진용 설명에는 회사명만 쓰고, 후기 본문은 넣지 않는다.
export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  const company = await getActiveCompanyBySlug(slug).catch(() => null)
  if (!company) return { description: t('meta.listDescription') }
  return {
    description: t('meta.companyDescription', { name: company.name, brand: BRAND_CONFIG.name }),
  }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  return <CompanyDetailScreen slug={slug} />
}
