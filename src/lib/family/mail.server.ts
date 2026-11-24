import { createHmac, timingSafeEqual } from 'node:crypto'

import { BRAND_CONFIG } from '@lib/brand'
import { cityPath, DEFAULT_CITY_ID } from '@lib/constants/cities'
import { isEmailConfigured, noticeEmail, sendEmail } from '@lib/email/send.server'
import { parseLocale, type Locale } from '@lib/i18n/locales'
import { localePath } from '@lib/i18n/paths'
import { getT } from '@lib/i18n/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { accountEmailOf } from './store.server'

/**
 * Family emails (ko / en / vi; texts in src/messages/{locale}/api.json `familyMail.*`). Every send is best effort:
 * a failed mail is logged, never fails the action. Senders: src/lib/family/*.server.ts.
 */

export const siteOrigin = () => BRAND_CONFIG.siteUrl.replace(/\/+$/, '')

export function familyPageUrl(locale: Locale) {
  return `${siteOrigin()}${localePath(locale, cityPath(DEFAULT_CITY_ID, '/me/family'))}`
}

export function acceptPageUrl(locale: Locale, token: string) {
  return `${siteOrigin()}${localePath(locale, cityPath(DEFAULT_CITY_ID, '/family/accept'))}?token=${encodeURIComponent(token)}`
}

function digestSecret() {
  return (
    process.env.FAMILY_DIGEST_SECRET?.trim() ||
    process.env.INTERNAL_POINTS_SECRET?.trim() ||
    process.env.INTERNAL_PUSH_SECRET?.trim() ||
    'misaeng-family-digest'
  )
}

export function unsubscribeSignature(uid: string) {
  return createHmac('sha256', digestSecret()).update(`digest-unsubscribe:${uid}`).digest('base64url').slice(0, 32)
}

export function verifyUnsubscribe(uid: string, signature: string) {
  const expected = Buffer.from(unsubscribeSignature(uid))
  const given = Buffer.from(String(signature || ''))
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export function unsubscribeUrl(uid: string) {
  return `${siteOrigin()}/api/family/digest/unsubscribe?u=${encodeURIComponent(uid)}&s=${unsubscribeSignature(uid)}`
}

/** Email + language of a member (null email: no mail). */
export async function recipientOf(uid: string) {
  const profile = await getSupabaseProfile(uid).catch(() => null)
  if (!profile || profile.status === 'deleted') return { email: null, locale: 'ko' as Locale, profile }
  const locale = parseLocale(profile.preferredLocale) ?? 'ko'
  return { email: await accountEmailOf(uid, profile), locale, profile }
}

async function send(to: string | null, locale: Locale, build: (t: Awaited<ReturnType<typeof getT>>) => {
  subject: string
  title: string
  lines: string[]
  button?: { label: string; url: string }
}) {
  if (!to || !isEmailConfigured()) return false
  const t = await getT(locale, 'api')
  const mail = build(t)
  const body = noticeEmail({ title: mail.title, lines: mail.lines, button: mail.button, footer: t('familyMail.footer') })
  try {
    await sendEmail({ to, subject: mail.subject, ...body })
    return true
  } catch (error) {
    console.error('[family mail] send failed', mail.subject, error)
    return false
  }
}

/** Parent → child: "○○ wants to link as your parent" (to the entered address; links to accept / sign-up). */
export function sendRequestMail(input: { to: string; locale: Locale; parentNickname: string | null; token: string; expiresAt: string }) {
  return send(input.to, input.locale, (t) => {
    const name = input.parentNickname || t('familyMail.someone')
    return {
      subject: t('familyMail.request.subject', { name }),
      title: t('familyMail.request.title', { name }),
      lines: [t('familyMail.request.line1', { name }), t('familyMail.request.line2'), t('familyMail.request.line3')],
      button: { label: t('familyMail.request.button'), url: acceptPageUrl(input.locale, input.token) },
    }
  })
}

/** To the parent: the child accepted. */
export async function sendLinkedMail(parentUid: string, childNickname: string | null) {
  const r = await recipientOf(parentUid)
  return send(r.email, r.locale, (t) => {
    const name = childNickname || t('familyMail.child')
    return {
      subject: t('familyMail.linked.subject', { name }),
      title: t('familyMail.linked.title', { name }),
      lines: [t('familyMail.linked.line1', { name }), t('familyMail.linked.line2')],
      button: { label: t('familyMail.open'), url: familyPageUrl(r.locale) },
    }
  })
}

/** To one side after an unlink. `renewal`: what happened to the parent-paid subscription (parent only). */
export async function sendUnlinkedMail(uid: string, otherNickname: string | null, role: 'parent' | 'child', renewal: 'stripe' | 'google' | 'apple_manual' | null) {
  const r = await recipientOf(uid)
  return send(r.email, r.locale, (t) => {
    const name = otherNickname || t(role === 'parent' ? 'familyMail.child' : 'familyMail.parent')
    const lines = [t(`familyMail.unlinked.${role}Line`, { name })]
    if (role === 'parent' && (renewal === 'stripe' || renewal === 'google')) lines.push(t('familyMail.unlinked.renewalStopped'))
    if (role === 'parent' && renewal === 'apple_manual') lines.push(t('familyMail.appleCancel.line2'), t('familyMail.appleCancel.line3'))
    if (role === 'child' && renewal) lines.push(t('familyMail.unlinked.childKeeps'))
    return {
      subject: t('familyMail.unlinked.subject', { name }),
      title: t('familyMail.unlinked.title', { name }),
      lines,
      button: { label: t('familyMail.open'), url: familyPageUrl(r.locale) },
    }
  })
}

/** To the parent: an App Store subscription for a child we can't stop — cancel it in iPhone Settings. */
export async function sendAppleCancelMail(parentUid: string, childNickname: string | null, until: string | null) {
  const r = await recipientOf(parentUid)
  return send(r.email, r.locale, (t) => {
    const name = childNickname || t('familyMail.child')
    const date = until ? formatDate(r.locale, until) : ''
    return {
      subject: t('familyMail.appleCancel.subject'),
      title: t('familyMail.appleCancel.title'),
      lines: [t('familyMail.appleCancel.line1', { name, date }), t('familyMail.appleCancel.line2'), t('familyMail.appleCancel.line3')],
    }
  })
}

/** To the parent: renewal (annual/season 7 days, monthly 3 days) or trial end (2 days) of a child's subscription. */
export async function sendRenewalMail(input: {
  parentUid: string
  childNickname: string | null
  kind: 'renewal' | 'trial'
  channel: 'stripe' | 'apple' | 'google'
  plan: string
  price: string
  date: string
}) {
  const r = await recipientOf(input.parentUid)
  return send(r.email, r.locale, (t) => {
    const name = input.childNickname || t('familyMail.child')
    const date = formatDate(r.locale, input.date)
    const plan = t(`familyMail.plan.${input.plan}`)
    return {
      subject: t(`familyMail.${input.kind}.subject`, { name }),
      title: t(`familyMail.${input.kind}.title`, { name, date }),
      lines: [
        t(`familyMail.${input.kind}.line`, { name, date, price: input.price, plan }),
        t(`familyMail.cancel.${input.channel}`),
        ...(input.channel === 'stripe' ? [t('familyMail.refundLine')] : []),
      ],
      button: input.channel === 'stripe' ? { label: t('familyMail.manage'), url: familyPageUrl(r.locale) } : undefined,
    }
  })
}

/** Parent digest (platform-wide counts only — never the child's activity). */
export async function sendDigestMail(input: { parentUid: string; day: number; postings: number; visaNews: number }) {
  const r = await recipientOf(input.parentUid)
  return send(r.email, r.locale, (t) => {
    const last = input.day >= 14
    return {
      subject: last ? t('familyMail.digest.lastSubject') : t('familyMail.digest.subject', { day: input.day }),
      title: t('familyMail.digest.title'),
      lines: [
        t('familyMail.digest.postings', { count: input.postings }),
        t('familyMail.digest.visaNews', { count: input.visaNews }),
        last ? t('familyMail.digest.last') : t('familyMail.digest.note'),
        t('familyMail.digest.unsubscribe', { url: unsubscribeUrl(input.parentUid) }),
      ],
      button: { label: t('familyMail.digest.button'), url: `${siteOrigin()}${localePath(r.locale, cityPath(DEFAULT_CITY_ID, '/'))}` },
    }
  })
}

export function formatDate(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(iso))
}
