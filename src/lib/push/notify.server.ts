import { after } from 'next/server'

import { parseLocale, type Locale } from '@lib/i18n/locales'
import type { Translate } from '@lib/i18n/translate'
import { getT } from '@lib/i18n/server'
import { isApnsConfigured, sendApns, type ApnsMessage } from './apns.server'
import { deletePushDevices, listPushDevices, usersWithTypeOff, type PushType } from './store.server'

/**
 * Sends a push to users' devices (misaeng-app), in each device's language, respecting their preferences.
 * Runs after the response (`after()`), never throws, and never blocks the action that caused it.
 * `build` gets the translator for the device language (all namespaces; push texts are `api.push.*`).
 */
export function notifyUsers(input: {
  /** 'account' = notices about the user's own account (verification results): sent regardless of the type switches */
  type: PushType | 'account'
  userIds: string[]
  build: (t: Translate, locale: Locale) => ApnsMessage
}) {
  if (!isApnsConfigured()) return
  const userIds = [...new Set(input.userIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (userIds.length === 0) return

  const run = async () => {
    try {
      const [devices, off] = await Promise.all([
        listPushDevices(userIds),
        input.type === 'account' ? Promise.resolve(new Set<string>()) : usersWithTypeOff(userIds, input.type),
      ])
      const targets = devices.filter((d) => !off.has(d.user_id) && d.platform === 'ios')
      if (targets.length === 0) return

      const byLocale = new Map<Locale, typeof targets>()
      for (const device of targets) {
        const locale = parseLocale(device.locale) ?? 'ko'
        byLocale.set(locale, [...(byLocale.get(locale) ?? []), device])
      }

      const dead: string[] = []
      for (const [locale, group] of byLocale) {
        const t = await getT(locale)
        const message = input.build(t, locale)
        const results = await sendApns(group, message)
        dead.push(...results.filter((r) => r.unregistered).map((r) => r.token))
        const failed = results.filter((r) => !r.ok && !r.unregistered)
        if (failed.length) console.error('APNs send failed:', failed.map((r) => `${r.status} ${r.reason}`).join(', '))
      }
      await deletePushDevices(dead).catch(() => undefined)
    } catch (error) {
      console.error('Push notify error:', error)
    }
  }

  try {
    after(run)
  } catch {
    void run()
  }
}

/** First line of a comment / post for the notification body. */
export function previewText(text: string, max = 80) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}
