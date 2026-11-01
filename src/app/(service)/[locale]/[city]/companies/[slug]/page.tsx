import type { Metadata } from 'next'

import { MemberGate } from '@components/MemberGate'
import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { shareMetadata } from '@lib/share/shareMetadata'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { CompanyDetailScreen } from '@screens/nyc/CompanyDetailScreen'

interface CompanyPageProps {
  params: Promise<{ locale: string; city: string; slug: string }>
}

// 탭 제목은 모든 페이지에서 사이트 기본값 그대로 둔다 (src/app/layout.tsx).
// 검색엔진용 설명에는 회사명만 쓰고, 후기 본문은 넣지 않는다.
export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { locale, city, slug } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  const company = await getActiveCompanyBySlug(slug).catch(() => null)
  // shared link preview: "미생에서 회사를 공유했어요" (members only, no review text)
  const share = await shareMetadata('company', locale, { path: `/${city}/companies/${slug}`, memberOnly: true })
  if (!company) return { ...share, description: t('meta.listDescription') }
  return {
    ...share,
    description: t('meta.companyDescription', { name: company.name, brand: BRAND_CONFIG.name }),
  }
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  return (
    <>
      <OpenInApp appPath={`company/${slug}`} />
      <MemberGate>
        <CompanyDetailScreen slug={slug} />
      </MemberGate>
    </>
  )
}
