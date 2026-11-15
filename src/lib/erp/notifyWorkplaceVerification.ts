export async function notifyErpWorkplaceVerification(args: {
  requestId: string
  companyName: string
  workEmail: string
  userEmail: string
  userNickname: string | null
  /** 1.0.7: 'documents' = 서류 제출 (workEmail 자리에 'Documents') */
  method?: 'email' | 'documents'
  workplaceKind?: 'current' | 'former'
}) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  const baseUrl = (
    process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io'
  ).replace(/\/+$/, '')
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
        type: 'workplace_verification',
        title: 'Workplace verification request',
        body: `${nickname} · ${args.companyName} · ${args.workEmail}${args.workplaceKind === 'former' ? ' · Former job' : ''}`,
        requestId: args.requestId,
        method: args.method ?? 'email',
        workplaceKind: args.workplaceKind ?? 'current',
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('ERP workplace verification notify failed:', error)
  }
}
