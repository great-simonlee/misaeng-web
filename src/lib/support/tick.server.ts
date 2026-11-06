import { addBusinessMinutes } from './hours'
import { eq, supportRest } from './rest.server'
import { getConversation, inBrandRotation, logEvent, signalConversation, staffRows, supportBrand } from './service.server'
import { getSupportSettings, normalizeEmail } from './settings.server'
import { sendStaffPush } from './staffPush.server'
import type { ConversationRow, SupportBrand } from './types'
import { emailUserOfUnreadReply } from './userNotify.server'

/**
 * The next member of this brand's rotation after `current` (wraps; skips off / inactive / current). Does not move the
 * cursor. Ellieo before supabase/support_brand_rotation.sql: nobody (→ the final contact).
 */
export async function nextInRotationAfter(current: string | null, brand: SupportBrand = 'misaeng'): Promise<string | null> {
  const rows = (await staffRows()).filter((r) => inBrandRotation(r, brand))
  const eligible = rows.filter((r) => r.active && r.accepting && r.email !== normalizeEmail(current))
  if (eligible.length === 0) return null
  const index = rows.findIndex((r) => r.email === normalizeEmail(current))
  if (index < 0) return eligible[0].email
  for (let step = 1; step <= rows.length; step += 1) {
    const candidate = rows[(index + step) % rows.length]
    if (eligible.some((r) => r.email === candidate.email)) return candidate.email
  }
  return eligible[0].email
}

async function reassign(row: ConversationRow, to: string, level: number, reason: string) {
  await supportRest(`support_conversations?id=${eq(row.id)}&escalation_level=eq.${row.escalation_level}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      assignee_email: to,
      assigned_at: new Date().toISOString(),
      escalation_level: level,
      updated_at: new Date().toISOString(),
    }),
  })
  await logEvent(row.id, 'assign', 'system', { from: row.assignee_email, to, reason })
  const updated = await getConversation(row.id)
  if (!updated) return
  await Promise.all([
    signalConversation(updated, 'assign'),
    sendStaffPush([to], {
      title: level >= 2 ? 'Unanswered housing lead (2h)' : 'Housing lead passed to you (1h no reply)',
      body: `${row.user_name || 'A user'}${row.listing_snapshot?.title ? ` · ${row.listing_snapshot.title}` : ''}`,
      data: { type: 'support', conversationId: row.id },
      sound: 'lead',
      threadId: `support-${row.id}`,
      brand: row.brand,
    }),
  ])
}

/**
 * 1h without a staff reply (housing hours only) → next staff in the conversation brand's rotation; 2h → the final
 * contact. Hours, minutes and the final contact come from the conversation brand's settings.
 */
async function runEscalations(now: Date) {
  const settingsByBrand = new Map<SupportBrand, Awaited<ReturnType<typeof getSupportSettings>>>()
  const settingsFor = async (brand: SupportBrand) => {
    if (!settingsByBrand.has(brand)) settingsByBrand.set(brand, await getSupportSettings(brand))
    return settingsByBrand.get(brand)!
  }
  const rows = await supportRest<ConversationRow[]>(
    'support_conversations?kind=eq.housing&status=eq.open&last_sender=eq.user&escalation_level=lt.2&sla_started_at=not.is.null&select=*&limit=200',
  )
  let moved = 0
  for (const row of rows ?? []) {
    const brand = supportBrand(row.brand)
    const settings = await settingsFor(brand)
    const [first, second] = settings['housing.escalate_minutes']
    const started = new Date(row.sla_started_at!)
    const final = normalizeEmail(settings['escalation.final'])
    if (second && now >= addBusinessMinutes(started, second, settings['housing.hours'])) {
      if (normalizeEmail(row.assignee_email) !== final) {
        await reassign(row, final, 2, 'escalation_2h')
      } else {
        await supportRest(`support_conversations?id=${eq(row.id)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({ escalation_level: 2 }),
        })
        await sendStaffPush([final], {
          title: 'Unanswered housing lead (2h)',
          body: `${row.user_name || 'A user'} is still waiting for a reply.`,
          data: { type: 'support', conversationId: row.id },
          sound: 'lead',
          threadId: `support-${row.id}`,
          brand,
        })
      }
      moved += 1
    } else if (row.escalation_level === 0 && first && now >= addBusinessMinutes(started, first, settings['housing.hours'])) {
      const next = (await nextInRotationAfter(row.assignee_email, brand)) || final
      if (normalizeEmail(next) !== normalizeEmail(row.assignee_email)) await reassign(row, next, 1, 'escalation_1h')
      else
        await supportRest(`support_conversations?id=${eq(row.id)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({ escalation_level: 1 }),
        })
      moved += 1
    }
  }
  return moved
}

/** Staff reply still unread after the delay → one email (at most one per conversation per hour). */
async function runDelayedEmails(now: Date) {
  const rows = await supportRest<ConversationRow[]>(
    `support_conversations?user_email_due_at=lte.${encodeURIComponent(now.toISOString())}&select=*&limit=100`,
  )
  let sent = 0
  for (const row of rows ?? []) {
    await supportRest(`support_conversations?id=${eq(row.id)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ user_email_due_at: null }),
    })
    const recentlyEmailed = row.user_emailed_at && now.getTime() - Date.parse(row.user_emailed_at) < 3_600_000
    if (row.user_unread <= 0 || recentlyEmailed) continue
    const ok = await emailUserOfUnreadReply(row).catch((error) => {
      console.error('Support reply email failed:', error)
      return false
    })
    if (ok) {
      sent += 1
      await supportRest(`support_conversations?id=${eq(row.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ user_emailed_at: now.toISOString() }),
      })
    }
  }
  return sent
}

export async function runSupportTick() {
  const now = new Date()
  const [escalated, emailed] = await Promise.all([runEscalations(now), runDelayedEmails(now)])
  return { escalated, emailed }
}
