export async function notifyErpWorkplaceVerification(args: {
  requestId: string
  companyName: string
  workEmail: string
  userEmail: string
  userNickname: string | null
}) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  const baseUrl = (
    process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io'
  ).replace(/\/+$/, '')
  if (!secret) return

  try {
    const nickname = args.userNickname?.trim() || args.userEmail || '사용자'
    await fetch(`${baseUrl}/api/misaeng-admin/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        type: 'workplace_verification',
        title: '직장인 인증 요청',
        body: `${nickname} · ${args.companyName} · ${args.workEmail}`,
        requestId: args.requestId,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('ERP workplace verification notify failed:', error)
  }
}
