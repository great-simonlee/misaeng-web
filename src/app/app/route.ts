import { NextResponse } from 'next/server'

import { BRAND_CONFIG } from '@lib/brand'
import { MISAENG_APP_STORE_URL, MISAENG_PLAY_STORE_URL } from '@widgets/nyc/MisaengStoreButtons'

export const dynamic = 'force-dynamic'

const IOS = /iPhone|iPad|iPod/i
const ANDROID = /Android/i

/**
 * misaeng.com/app — the install link (QR codes, flyers, bios): iPhone/iPad → App Store, Android → Google Play,
 * anything else (a computer) → a small page with both store buttons. Misaeng only; other brands go home.
 */
export function GET(request: Request) {
  if (BRAND_CONFIG.id !== 'misaeng') return NextResponse.redirect(new URL('/', request.url), 307)
  const ua = request.headers.get('user-agent') || ''
  if (IOS.test(ua)) return NextResponse.redirect(MISAENG_APP_STORE_URL, 302)
  if (ANDROID.test(ua)) return NextResponse.redirect(MISAENG_PLAY_STORE_URL, 302)
  return new NextResponse(fallbackPage(), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Computers (and anything we can't tell): both stores. Korean first, English under it. */
function fallbackPage() {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>미생 앱 받기 · Get the Misaeng app</title>
<meta name="apple-itunes-app" content="app-id=6826454902">
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f6f8; color: #0f172a;
    font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif; }
  main { width: min(360px, calc(100% - 32px)); background: #fff; border-radius: 24px; padding: 28px;
    box-shadow: 0 20px 50px rgba(15,23,42,.10); border: 1px solid rgba(15,23,42,.07); text-align: center; }
  img { width: 64px; height: 64px; border-radius: 16px; }
  h1 { font-size: 20px; margin: 16px 0 6px; letter-spacing: -0.02em; }
  p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }
  a { display: flex; align-items: center; justify-content: center; height: 48px; border-radius: 14px; margin-top: 10px;
    font-weight: 600; font-size: 15px; text-decoration: none; }
  .ios { background: #0f172a; color: #fff; margin-top: 22px; }
  .android { background: #fff; color: #0f172a; border: 1px solid rgba(15,23,42,.12); }
</style>
</head>
<body>
<main>
  <img src="/img/logo_square.png" alt="">
  <h1>미생 앱 받기</h1>
  <p>미국 유학생·직장인 커뮤니티 미생<br>Get the Misaeng app</p>
  <a class="ios" href="${MISAENG_APP_STORE_URL}">App Store</a>
  <a class="android" href="${MISAENG_PLAY_STORE_URL}">Google Play</a>
</main>
</body>
</html>`
}
