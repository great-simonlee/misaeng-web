import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { BRAND_CONFIG, isServiceLocale } from '@lib/brand'
import { isLocale, OG_LOCALES } from '@lib/i18n/locales'
import { getClientMessages, getMessages } from '@lib/i18n/messages.server'
import { createTranslator } from '@lib/i18n/translate'
import { RootDocument } from '@widgets/RootDocument'
import '../../globals.css'

/**
 * 도시 서비스 루트 layout. URL 언어(`/vi/nyc/...`, 기본 언어는 proxy가 rewrite)로 `<html lang>`과
 * 화면 문구를 정한다. 검색용 canonical·hreflang·noindex는 proxy가 HTTP 헤더로 붙인다.
 */

type ServiceLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return BRAND_CONFIG.serviceLocales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: ServiceLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = createTranslator(await getMessages(locale), locale)
  const title = t('common.meta.title', { brand: BRAND_CONFIG.name })
  const description = t('common.meta.description', { brand: BRAND_CONFIG.name })
  return {
    metadataBase: new URL(BRAND_CONFIG.siteUrl),
    icons: { icon: BRAND_CONFIG.assets.favicon },
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: BRAND_CONFIG.name,
      locale: OG_LOCALES[locale],
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/twitter-image.png'],
    },
  }
}

export default async function ServiceLayout({ children, params }: ServiceLayoutProps) {
  const { locale } = await params
  if (!isLocale(locale) || !isServiceLocale(locale)) notFound()

  const messages = await getClientMessages(locale)

  return (
    <RootDocument i18n={{ locale, messages }} service>
      {children}
    </RootDocument>
  )
}
