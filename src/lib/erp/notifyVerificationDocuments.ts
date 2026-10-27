/**
 * Reports verification-document problems to ellieo-erp (same path as the workplace/Instagram request alerts):
 * files that could not be deleted after 3 retries, and files kept past their deletion time (must always be 0).
 * Never throws. No document contents or user details are sent — ids and counts only.
 */
export async function notifyErpVerificationDocuments(args: { title: string; body: string }) {
  const secret = process.env.MISAENG_ERP_NOTIFY_SECRET?.trim()
  const baseUrl = (process.env.ELLIEO_ERP_BASE_URL || 'https://ellieo.io').replace(/\/+$/, '')
  if (!secret) {
    console.error(`[verification docs] ${args.title}: ${args.body} (MISAENG_ERP_NOTIFY_SECRET not set)`)
    return
  }
  try {
    await fetch(`${baseUrl}/api/misaeng-admin/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ type: 'verification_documents', title: args.title, body: args.body }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('ERP verification documents notify failed:', error)
  }
}
