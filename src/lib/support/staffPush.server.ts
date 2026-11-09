import { isApnsConfigured, sendApns, type ApnsEnvironment } from '@lib/push/apns.server'

import { staffBrandPrefix } from './brand'
import { inList, supportRest } from './rest.server'
import type { HousingProfile, SupportBrand } from './types'

/**
 * Push to the "Misaeng ERP" staff app (APNs, same team key as the user app, topic STAFF_APNS_BUNDLE_ID).
 * Staff texts are English (the ERP is English only). Never throws.
 */

type StaffDevice = { token: string; email: string; environment: ApnsEnvironment }

const staffBundleId = () => process.env.STAFF_APNS_BUNDLE_ID?.trim() || 'com.misaeng.erp'

/** The Super Admin: always hears about new sign-ups and new 문의/건의 in the Misaeng ERP app. */
export const SUPER_ADMIN_EMAIL = 'simon@misaeng.com'

const otherEnvironment = (environment: ApnsEnvironment): ApnsEnvironment => (environment === 'sandbox' ? 'production' : 'sandbox')

export type StaffPush = {
  title: string
  subtitle?: string
  body: string
  /** read by the staff app on tap: { type: 'support' | 'inquiry' | 'report', conversationId?, reportId? } */
  data?: Record<string, string>
  threadId?: string
  /** Kind of alert (lead / message / review). Every alert currently plays STAFF_SOUND_FILE. */
  sound?: StaffSound
  /**
   * A chat message: the staff app shows it like a messenger (sender initials + name as the title, the text below),
   * built by its Notification Service Extension from these fields. `avatarUrl` = the user's profile photo, if any.
   */
  sender?: { id: string; name: string; avatarUrl?: string | null }
  /** Brand of the conversation: Ellieo titles get an "[Ellieo] " prefix (Misaeng unchanged). */
  brand?: SupportBrand | string | null
}

/** `review`: a new job review through a partner. */
export type StaffSound = 'lead' | 'message' | 'review'
/**
 * Every Misaeng ERP alert plays the app's own sound, duo.caf (two soft marimba notes; owner pick 2026-11-08) — leads,
 * chat replies, sign-ups, posts and Sales alerts alike. App builds without duo.caf fall back to the iOS default sound.
 */
const STAFF_SOUND_FILE = 'duo.caf'

/** Returns how many registered devices the push went to (for the admin test push); 0 when nothing was sent. */
export async function sendStaffPush(
  emails: (string | null | undefined)[],
  message: StaffPush,
): Promise<{ devices: number; sent: number }> {
  const none = { devices: 0, sent: 0 }
  const targets = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))]
  if (targets.length === 0) return none
  // Logged (not silent): a staff alert that never arrives is otherwise impossible to trace on the server
  if (!isApnsConfigured()) {
    console.error(`Staff push skipped ("${message.title}"): APNs is not configured (APNS_TEAM_ID + APNS_KEY_ID + APNS_KEY).`)
    return none
  }
  try {
    const devices = await supportRest<StaffDevice[]>(
      `staff_push_devices?email=in.${encodeURIComponent(inList(targets))}&select=token,email,environment`,
    )
    if (!devices?.length) {
      console.warn(`Staff push skipped ("${message.title}"): no Misaeng ERP app device registered for ${targets.join(', ')}.`)
      return none
    }
    const payload = {
      title: `${staffBrandPrefix(message.brand)}${message.title}`,
      subtitle: message.subtitle,
      body: message.body,
      threadId: message.threadId,
      sound: STAFF_SOUND_FILE,
      mutableContent: Boolean(message.sender),
      data: {
        ...(message.data ?? {}),
        ...(message.sender ? { senderId: message.sender.id, senderName: message.sender.name } : {}),
        ...(message.sender?.avatarUrl ? { senderAvatarUrl: message.sender.avatarUrl } : {}),
      },
    }
    const options = { topic: staffBundleId() }
    const results = await sendApns(devices, payload, options)

    // BadDeviceToken usually means the token is from the other APNs environment (a build signed differently from
    // what the app reported). Try that environment once before dropping the device, and remember it when it works.
    const wrongEnv = results.filter((r) => r.status === 400 && r.reason === 'BadDeviceToken')
    const moved = new Set<string>()
    if (wrongEnv.length) {
      const retry = wrongEnv
        .map((r) => devices.find((d) => d.token === r.token)!)
        .map((d) => ({ ...d, environment: otherEnvironment(d.environment) }))
      const retried = await sendApns(retry, payload, options)
      for (const r of retried.filter((x) => x.ok)) {
        moved.add(r.token)
        const device = retry.find((d) => d.token === r.token)!
        const index = results.findIndex((x) => x.token === r.token)
        if (index >= 0) results[index] = r
        await supportRest(`staff_push_devices?token=eq.${encodeURIComponent(r.token)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({ environment: device.environment, updated_at: new Date().toISOString() }),
        }).catch(() => undefined)
      }
    }

    const dead = results.filter((r) => r.unregistered && !moved.has(r.token)).map((r) => r.token)
    if (dead.length) {
      console.warn(`Staff push: removing ${dead.length} unregistered device(s):`, results.filter((r) => dead.includes(r.token)).map((r) => `${r.status} ${r.reason}`).join(', '))
      await supportRest(`staff_push_devices?token=in.${encodeURIComponent(inList(dead))}`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      }).catch(() => undefined)
    }
    const failed = results.filter((r) => !r.ok && !r.unregistered)
    if (failed.length) console.error('Staff push failed:', failed.map((r) => `${r.status} ${r.reason}`).join(', '))
    return { devices: devices.length, sent: results.filter((r) => r.ok).length }
  } catch (error) {
    console.error('Staff push error:', error)
    return none
  }
}

// MARK: texts (the staff app is English only)

const ROOM_LABELS: Record<string, string> = {
  roommate_room: 'Room in a shared unit',
  studio: 'Studio',
  one_bed: '1BR',
  two_bed_plus: '2BR+',
  any: 'Any room',
}
const ROOM_KIND_LABELS: Record<string, string> = {
  master: 'master',
  regular: 'regular',
  flex: 'flex',
  any: 'any',
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** "1500_2000" → "$1,500–2,000", "under_1500" → "under $1,500", "over_4500" → "$4,500+" */
function budgetRange(key: string) {
  const [a, b] = key.split('_')
  if (a === 'under') return `under ${money(Number(b))}`
  if (a === 'over') return `${money(Number(b))}+`
  return Number(a) && Number(b) ? `${money(Number(a))}–${Number(b).toLocaleString('en-US')}` : ''
}

/** "2026-12-01" → "Dec 1" */
function shortDate(value?: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return ''
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** One-line message text for a lock screen. */
export function pushPreview(text: string, max = 160) {
  const plain = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

/**
 * New housing lead:
 *   🏠 New lead · River Road #40-2A
 *   Seunghoon Lee · Worker · Move-in Dec 1
 *   $1,800/mo · Studio · 1 person — “Hi! I'm asking about River Road.”
 */
export function housingLeadPush(input: {
  userName: string | null
  listingTitle?: string | null
  profile?: HousingProfile | null
  message: string
}): Pick<StaffPush, 'title' | 'subtitle' | 'body'> {
  const p = input.profile ?? {}
  const who = p.occupation === 'student' ? `Student${p.school ? ` (${p.school})` : ''}` : p.occupation === 'worker' ? 'Worker' : ''
  const moveIn = shortDate(p.moveIn)
  const budget = p.budgetAmount ? `${money(p.budgetAmount)}/mo` : p.budget ? `${budgetRange(p.budget)}/mo` : ''
  const room = p.roomType
    ? `${ROOM_LABELS[p.roomType] ?? p.roomType}${p.roomType === 'roommate_room' && p.roomKind ? ` (${ROOM_KIND_LABELS[p.roomKind] ?? p.roomKind})` : ''}`
    : ''
  const people = p.occupants ? `${p.occupants} ${p.occupants === 1 ? 'person' : 'people'}` : ''
  const facts = [budget, room, people].filter(Boolean).join(' · ')
  const quote = pushPreview(input.message, 120)
  return {
    title: `🏠 New lead${input.listingTitle ? ` · ${input.listingTitle}` : ''}`,
    subtitle: [input.userName || 'A user', who, moveIn ? `Move-in ${moveIn}` : ''].filter(Boolean).join(' · '),
    body: [facts, quote ? `“${quote}”` : ''].filter(Boolean).join(' — '),
  }
}
