import type { ReactNode } from 'react'
import { Geist_Mono } from 'next/font/google'

import { AuthProvider } from '@hooks/useAuth'
import { ToastProvider } from '@hooks/useToast'
import { ConsentLocaleProvider } from '@components/consent/ConsentLocaleProvider'
import { ReconsentGate } from '@components/consent/ReconsentGate'
import { BRAND, BRAND_CONFIG } from '@lib/brand'
import { LocaleProvider } from '@lib/i18n/client'
import type { Locale } from '@lib/i18n/locales'
import type { MessageTree } from '@lib/i18n/translate'
import { beVietnamPro } from '@lib/fonts/ellieo'
import { pretendard } from '@lib/fonts/pretendard'
import { SiteFooter } from '@widgets/SiteFooter'
import { PreferredLocaleSync } from '@widgets/PreferredLocaleSync'
import { SiteHeader } from '@widgets/SiteHeader'
import { SiteMain } from '@widgets/SiteMain'

/** Ellieo만 Be Vietnam Pro를 내려받는다. Misaeng은 Pretendard 그대로 */
const brandFontVariable = BRAND_CONFIG.theme === 'ellieo' ? beVietnamPro.variable : ''

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * 회사 페이지·도시 서비스 두 루트 layout이 같이 쓰는 문서 뼈대.
 * 언어만 다르고 (회사 = en, 서비스 = URL 언어) 나머지는 같다. 헤더·푸터까지 같은 언어로 그린다.
 */
export function RootDocument({
  i18n,
  service = false,
  children,
}: {
  i18n: { locale: Locale; messages: MessageTree }
  /** 도시 서비스 페이지 (선호 언어 동기화는 서비스에서만) */
  service?: boolean
  children: ReactNode
}) {
  const shell = (
    <div className='flex min-h-dvh flex-col'>
      <AuthProvider>
        <ConsentLocaleProvider>
          <ToastProvider>
            {service ? <PreferredLocaleSync /> : null}
            <SiteHeader />

            <SiteMain>
              <ReconsentGate>{children}</ReconsentGate>
            </SiteMain>

            <SiteFooter />
          </ToastProvider>
        </ConsentLocaleProvider>
      </AuthProvider>
    </div>
  )

  return (
    <html lang={i18n.locale} data-brand={BRAND} suppressHydrationWarning>
      {/* overflow-x-clip (not hidden): hidden turns <body> into a scroll container and breaks position: sticky.
          Horizontal scroll is still blocked by html { overflow-x: hidden } in globals.css. */}
      <body
        className={`${pretendard.variable} ${geistMono.variable} ${brandFontVariable} min-w-0 overflow-x-clip antialiased bg-[var(--background)] text-[var(--foreground)]`}
        suppressHydrationWarning
      >
        <LocaleProvider locale={i18n.locale} messages={i18n.messages}>
          {shell}
        </LocaleProvider>
      </body>
    </html>
  )
}
