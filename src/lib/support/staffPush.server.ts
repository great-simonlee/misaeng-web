import { isApnsConfigured, sendApns, type ApnsEnvironment } from '@lib/push/apns.server'

import { inList, supportRest } from './rest.server'

/**
 * Push to the "Misaeng ERP" staff app (APNs, same team key as the user app, topic STAFF_APNS_BUNDLE_ID).
 * Staff texts are English (the ERP is English only). Never throws.
 */

type StaffDevice = { token: string; email: string; environment: ApnsEnvironment }

const staffBundleId = () => process.env.STAFF_APNS_BUNDLE_ID?.trim() || 'com.misaeng.erp'

export type StaffPush = {
  title: string
  body: string
  /** read by the staff app on tap: { type: 'support' | 'inquiry' | 'report', conversationId?, reportId? } */
  data?: Record<string, string>
  threadId?: string
}

export async function sendStaffPush(emails: (string | null | undefined)[], message: StaffPush) {
  const targets = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))]
  if (targets.length === 0 || !isApnsConfigured()) return
  try {
    const devices = await supportRest<StaffDevice[]>(
      `staff_push_devices?email=in.${encodeURIComponent(inList(targets))}&select=token,email,environment`,
    )
    if (!devices?.length) return
    const results = await sendApns(devices, message, { topic: staffBundleId() })
    const dead = results.filter((r) => r.unregistered).map((r) => r.token)
    if (dead.length) {
      await supportRest(`staff_push_devices?token=in.${encodeURIComponent(inList(dead))}`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      }).catch(() => undefined)
    }
    const failed = results.filter((r) => !r.ok && !r.unregistered)
    if (failed.length) console.error('Staff push failed:', failed.map((r) => `${r.status} ${r.reason}`).join(', '))
  } catch (error) {
    console.error('Staff push error:', error)
  }
}
