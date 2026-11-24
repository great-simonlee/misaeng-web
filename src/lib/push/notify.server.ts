import { after } from 'next/server'

import { parseLocale, type Locale } from '@lib/i18n/locales'
import type { Translate } from '@lib/i18n/translate'
import { getT } from '@lib/i18n/server'
import { isApnsConfigured, sendApns, type ApnsMessage } from './apns.server'
import { isFcmConfigured, sendFcm } from './fcm.server'
import { appBadgeCount } from './badge.server'
import { recordNotifications } from './inbox.server'
import { deletePushDevices, listPushDevices, usersWithTypeOff, type PushType } from './store.server'

/**
 * Sends a push to users' devices (misaeng-app: iOS through APNs, Android through FCM), in each device's language, respecting their preferences, and stores
 * the same notification in the in-app inbox (bell on Home) for every user — even without a device or with that push off.
 * Runs after the response (`after()`), never throws, and never blocks the action that caused it.
 * `build` gets the translator for the device language (all namespaces; push texts are `api.push.*`).
 */
type NotifyInput = {
  /** 'account' = notices about the user's own account (verification results): sent regardless of the type switches */
  type: PushType | 'account'
  userIds: string[]
  build: (t: Translate, locale: Locale) => ApnsMessage
  /** false = inbox only, no push (throttled notifications). Default true. */
  push?: boolean
  /** false = push only, no in-app inbox entry (support chat messages have their own unread badge). Default true. */
  inbox?: boolean
  /** Inbox keeps one row per threadId (replaced on each send) instead of one per notification. */
  replaceThread?: boolean
}

export function notifyUsers(input: NotifyInput) {
  const userIds = [...new Set(input.userIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (userIds.length === 0) return
  const run = () => deliver(input, userIds)
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * A broadcast to many users (digests, a new job review): one background job that sends `chunk` users at a time,
 * one chunk after another (2026-11-17 review: 500-user chunks all at once made ~2 badge counts per user hit Supabase
 * together, and a 500-id filter made a very long URL).
 */
export function notifyUsersInChunks(
  input: NotifyInput & {
    /** Narrows the users inside the background job (postings push: verified members), so the caller isn't held. */
    audience?: (userIds: string[]) => Promise<string[]>
  },
  chunk = 100,
) {
  const candidates = [...new Set(input.userIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (candidates.length === 0) return
  const run = async () => {
    const userIds = input.audience
      ? await input.audience(candidates).catch((error) => {
          console.error('Broadcast audience error:', error)
          return [] as string[]
        })
      : candidates
    if (input.audience) console.log(`Broadcast ${input.type}: ${userIds.length} of ${candidates.length} users`)
    for (let i = 0; i < userIds.length; i += chunk) {
      // One chunk's failure (e.g. the inbox insert) never stops the rest
      await deliver(input, userIds.slice(i, i + chunk)).catch((error) => console.error('Broadcast chunk error:', error))
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

async function deliver(input: NotifyInput, userIds: string[]) {
  if (input.inbox !== false) await recordNotifications({ type: input.type, userIds, build: input.build, replaceThread: input.replaceThread })
  const apns = isApnsConfigured()
  const fcm = isFcmConfigured()
  if (input.push === false || (!apns && !fcm)) return
  try {
    const [devices, off] = await Promise.all([
      listPushDevices(userIds),
      input.type === 'account' ? Promise.resolve(new Set<string>()) : usersWithTypeOff(userIds, input.type),
    ])
    const targets = devices.filter(
      (d) => !off.has(d.user_id) && ((d.platform === 'ios' && apns) || (d.platform === 'android' && fcm)),
    )
    if (targets.length === 0) return

    const byLocale = new Map<Locale, typeof targets>()
    for (const device of targets) {
      // Ellieo is English first: a device without a known language gets English
      const locale = parseLocale(device.locale) ?? 'en'
      byLocale.set(locale, [...(byLocale.get(locale) ?? []), device])
    }

    // App icon number per user, counted after the inbox row above was written; 20 users at a time
    const badges = new Map<string, number>()
    const uids = [...new Set(targets.map((d) => d.user_id))]
    for (let i = 0; i < uids.length; i += 20) {
      await Promise.all(uids.slice(i, i + 20).map(async (uid) => badges.set(uid, await appBadgeCount(uid))))
    }

    const dead: string[] = []
    for (const [locale, group] of byLocale) {
      const t = await getT(locale)
      const base = input.build(t, locale)
      for (const uid of new Set(group.map((d) => d.user_id))) {
        const mine = group.filter((d) => d.user_id === uid)
        const message = { ...base, badge: badges.get(uid) }
        const ios = mine.filter((d) => d.platform === 'ios')
        const android = mine.filter((d) => d.platform === 'android')
        const [apnsResults, fcmResults] = await Promise.all([
          ios.length ? sendApns(ios, message) : Promise.resolve([]),
          android.length ? sendFcm(android, message).catch((error) => {
            console.error('FCM send error:', error)
            return []
          }) : Promise.resolve([]),
        ])
        const results = [...apnsResults, ...fcmResults]
        dead.push(...results.filter((r) => r.unregistered).map((r) => r.token))
        const failed = results.filter((r) => !r.ok && !r.unregistered)
        if (failed.length) console.error('Push send failed:', failed.map((r) => `${r.status} ${r.reason}`).join(', '))
      }
    }
    await deletePushDevices(dead).catch(() => undefined)
  } catch (error) {
    console.error('Push notify error:', error)
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
