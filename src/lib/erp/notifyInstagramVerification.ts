/** 새 인스타그램 인증 요청을 ERP 알림으로 보낸다 (직장인 인증 알림과 같은 경로). 실패해도 요청은 그대로 진행. */
export async function notifyErpInstagramVerification(args: {
  requestId: string
  handle: string
  code: string
  userEmail: string
  userNickname: string | null
}) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  const baseUrl = (process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io').replace(/\/+$/, '')
  if (!secret) return

  try {
    const nickname = args.userNickname?.trim() || args.userEmail || 'User'
    await fetch(`${baseUrl}/api/misaeng-admin/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        type: 'instagram_verification',
        title: 'Instagram verification request',
        body: `${nickname} · @${args.handle} · ${args.code}`,
        requestId: args.requestId,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('ERP instagram verification notify failed:', error)
  }
}
