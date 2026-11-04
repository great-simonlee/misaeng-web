import { isApnsConfigured, sendApns, type ApnsEnvironment } from '@lib/push/apns.server'

import { inList, supportRest } from './rest.server'
import type { HousingProfile } from './types'

/**
 * Push to the "Misaeng ERP" staff app (APNs, same team key as the user app, topic STAFF_APNS_BUNDLE_ID).
 * Staff texts are English (the ERP is English only). Never throws.
 */

type StaffDevice = { token: string; email: string; environment: ApnsEnvironment }

const staffBundleId = () => process.env.STAFF_APNS_BUNDLE_ID?.trim() || 'com.misaeng.erp'

export type StaffPush = {
  title: string
  subtitle?: string
  body: string
  /** read by the staff app on tap: { type: 'support' | 'inquiry' | 'report', conversationId?, reportId? } */
  data?: Record<string, string>
  threadId?: string
  /** Sound in the staff app bundle: new leads / inquiries ring louder than a reply in an open chat. */
  sound?: StaffSound
  /**
   * A chat message: the staff app shows it like a messenger (sender initials + name as the title, the text below),
   * built by its Notification Service Extension from these fields.
   */
  sender?: { id: string; name: string }
}

export type StaffSound = 'lead' | 'message'
const SOUND_FILES: Record<StaffSound, string> = { lead: 'lead.caf', message: 'message.caf' }

export async function sendStaffPush(emails: (string | null | undefined)[], message: StaffPush) {
  const targets = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))]
  if (targets.length === 0 || !isApnsConfigured()) return
  try {
    const devices = await supportRest<StaffDevice[]>(
      `staff_push_devices?email=in.${encodeURIComponent(inList(targets))}&select=token,email,environment`,
    )
    if (!devices?.length) return
    const results = await sendApns(
      devices,
      {
        title: message.title,
        subtitle: message.subtitle,
        body: message.body,
        threadId: message.threadId,
        sound: message.sound ? SOUND_FILES[message.sound] : undefined,
        mutableContent: Boolean(message.sender),
        data: {
          ...(message.data ?? {}),
          ...(message.sender ? { senderId: message.sender.id, senderName: message.sender.name } : {}),
        },
      },
      { topic: staffBundleId() },
    )
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
