import type { Metadata } from 'next'

import { BRAND_CONFIG } from '@lib/brand'

/**
 * 404 for URLs no layout matches (e.g. `/x/y/z`). This app has two root layouts ((corporate), (service)),
 * so without this file Next's default 404 has no metadataBase and og:image pointed at localhost.
 * Same look as Next's default page; enabled by `experimental.globalNotFound` in next.config.ts.
 */
export const metadata: Metadata = {
  metadataBase: new URL(BRAND_CONFIG.siteUrl),
  title: `404: This page could not be found. | ${BRAND_CONFIG.name}`,
  robots: { index: false, follow: false },
  icons: { icon: BRAND_CONFIG.assets.favicon },
}

export default function GlobalNotFound() {
  return (
    <html lang='en'>
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <h1
            style={{
              display: 'inline-block',
              margin: '0 20px 0 0',
              padding: '0 23px 0 0',
              fontSize: 24,
              fontWeight: 500,
              verticalAlign: 'top',
              lineHeight: '49px',
              borderRight: '1px solid rgba(0,0,0,.3)',
            }}
          >
            404
          </h1>
          <div style={{ display: 'inline-block' }}>
            <h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: '49px', margin: 0 }}>
              This page could not be found.
            </h2>
          </div>
        </div>
        <a href={BRAND_CONFIG.hasCorporateSite ? '/' : '/nyc'} style={{ marginTop: 24, fontSize: 14, color: BRAND_CONFIG.colors.brand }}>
          {BRAND_CONFIG.name}
        </a>
      </body>
    </html>
  )
}
