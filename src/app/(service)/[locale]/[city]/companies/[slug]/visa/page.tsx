import type { Metadata } from 'next'

import { MemberGate } from '@components/MemberGate'
import { OpenInApp } from '@components/OpenInApp'
import { BRAND_CONFIG } from '@lib/brand'
import { isLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { CompanyVisaScreen } from '@screens/nyc/CompanyVisaScreen'

interface CompanyVisaPageProps {
  params: Promise<{ locale: string; city: string; slug: string }>
}

// Premium page: no figures in the metadata, just the company name.
export async function generateMetadata({ params }: CompanyVisaPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const t = await getT(isLocale(locale) ? locale : BRAND_CONFIG.serviceDefaultLocale, 'companies')
  const company = await getActiveCompanyBySlug(slug).catch(() => null)
  return {
    description: company
      ? `${company.name} · ${t('sponsor.title')}`
      : t('meta.listDescription'),
    robots: { index: false },
  }
}

export default async function CompanyVisaPage({ params }: CompanyVisaPageProps) {
  const { slug } = await params
  return (
    <>
      <OpenInApp appPath={`company/${slug}`} />
      <MemberGate>
        <CompanyVisaScreen slug={slug} />
      </MemberGate>
    </>
  )
}
