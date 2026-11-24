import { setDigestOptOut } from '@lib/family/family.server'
import { verifyUnsubscribe } from '@lib/family/mail.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#0f172a">
<div style="max-width:440px;margin:64px auto;padding:32px 28px;background:#fff;border-radius:20px">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1><p style="font-size:15px;line-height:1.6;color:#475569;margin:0">${body}</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )

/** GET /api/family/digest/unsubscribe?u=&s= — the link in the parent digest mail (signed; no login). */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const uid = url.searchParams.get('u')?.trim() || ''
  const sig = url.searchParams.get('s')?.trim() || ''
  if (!uid || !verifyUnsubscribe(uid, sig)) {
    return page('링크가 올바르지 않아요 · Invalid link', '앱의 설정에서 알림을 끌 수 있어요. · You can turn it off in the app settings.')
  }
  try {
    await setDigestOptOut(uid, true)
  } catch (error) {
    console.error('[family digest] unsubscribe failed', error)
    return page('잠시 후 다시 시도해 주세요 · Try again later', '처리하지 못했어요. · Something went wrong.')
  }
  return page(
    '자녀 소식 알림을 껐어요 · Unsubscribed',
    '더 이상 미생 학부모 소식 메일·알림을 보내지 않아요. 자녀의 프리미엄과 알림은 그대로예요. · You will no longer get the Misaeng parent digest. Your child’s Premium and alerts are not affected.',
  )
}
