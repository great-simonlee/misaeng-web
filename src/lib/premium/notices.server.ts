import type Stripe from 'stripe'

import { isEmailConfigured, noticeEmail, sendEmail } from '@lib/email/send.server'
import { parseLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { notifyUsers } from '@lib/push/notify.server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { getStripe, isPremiumPrice } from './stripe.server'

/**
 * Reminders before money moves (refund policy 11-22), from Stripe webhooks:
 * - customer.subscription.trial_will_end (Stripe sends it 3 days before the trial ends) → push + email
 * - invoice.upcoming for an ANNUAL plan (Stripe Dashboard → Billing → Subscriptions → "Upcoming renewal events" = 7
 *   days) → email. Monthly / 3-month renewals get no reminder.
 * Both say the price, the date, how to cancel, and the 7-day refund rule.
 */

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://misaeng.com').replace(/\/+$/, '')

function money(amount: number, currency: string | null | undefined) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(amount / 100)
}

async function recipient(uid: string, fallbackEmail: string | null | undefined) {
  const profile = await getSupabaseProfile(uid).catch(() => null)
  const locale = parseLocale(profile?.preferredLocale) ?? 'ko'
  const email = String(fallbackEmail || '').trim()
  return { locale, email: email.includes('@') ? email : null }
}

function dateIn(locale: string, seconds: number) {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(seconds * 1000))
}

export async function sendTrialEndingNotice(sub: Stripe.Subscription) {
  const uid = sub.metadata?.user_uid
  const item = sub.items?.data?.[0]
  if (!uid || !isPremiumPrice(item?.price) || sub.status !== 'trialing' || !sub.trial_end || sub.cancel_at_period_end) return
  const amount = item?.price?.unit_amount ?? 0
  const price = money(amount, item?.price?.currency)
  const { locale, email } = await recipient(uid, sub.metadata?.email)
  const date = dateIn(locale, sub.trial_end)
  const t = await getT(locale, 'premium')
  const url = `${siteUrl()}/${locale}/nyc/premium`

  notifyUsers({
    type: 'account',
    userIds: [uid],
    inbox: false,
    build: (tt) => ({
      title: tt('premium.notices.trialPushTitle'),
      body: tt('premium.notices.trialPushBody', { date, price }),
      data: { type: 'premium', url },
    }),
  })

  if (!email || !isEmailConfigured()) return
  const mail = noticeEmail({
    title: t('notices.trialTitle'),
    lines: [t('notices.trialLine', { date, price }), t('notices.cancelLine'), t('notices.refundLine')],
    button: { label: t('notices.manage'), url },
    footer: t('notices.footer'),
  })
  await sendEmail({ to: email, subject: t('notices.trialSubject'), ...mail }).catch((error) =>
    console.error('[premium notice] trial email failed', error),
  )
}

export async function sendRenewalNotice(invoice: Stripe.Invoice) {
  const stripe = getStripe()
  if (!stripe) return
  // Webhook payloads use the account's API version: the subscription is under parent.subscription_details there.
  const inv = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null
    parent?: { subscription_details?: { subscription?: string } | null } | null
  }
  const subId =
    (typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id) ||
    inv.parent?.subscription_details?.subscription
  if (!subId) return
  const sub = await stripe.subscriptions.retrieve(subId)
  const uid = sub.metadata?.user_uid
  const subPrice = sub.items?.data?.[0]?.price
  const annual = subPrice?.recurring?.interval === 'year'
  if (!uid || !isPremiumPrice(subPrice) || !annual || sub.status !== 'active' || sub.cancel_at_period_end) return
  const when = invoice.next_payment_attempt ?? invoice.period_end
  const { locale, email } = await recipient(uid, invoice.customer_email || sub.metadata?.email)
  if (!email || !isEmailConfigured() || !when) return
  const t = await getT(locale, 'premium')
  const date = dateIn(locale, when)
  const price = money(invoice.amount_due, invoice.currency)
  const mail = noticeEmail({
    title: t('notices.renewalTitle'),
    lines: [t('notices.renewalLine', { date, price }), t('notices.cancelLine'), t('notices.refundLine')],
    button: { label: t('notices.manage'), url: `${siteUrl()}/${locale}/nyc/premium` },
    footer: t('notices.footer'),
  })
  await sendEmail({ to: email, subject: t('notices.renewalSubject'), ...mail }).catch((error) =>
    console.error('[premium notice] renewal email failed', error),
  )
}
