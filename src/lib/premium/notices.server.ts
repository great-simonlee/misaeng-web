import type Stripe from 'stripe'

import { isEmailConfigured, noticeEmail, sendEmail } from '@lib/email/send.server'
import { parseLocale } from '@lib/i18n/locales'
import { getT } from '@lib/i18n/server'
import { getSupabaseProfile } from '@lib/supabase/profile.server'

import { getStripe, isPremiumPrice } from './stripe.server'

/**
 * Reminders before money moves (refund policy 11-22), from Stripe webhooks:
 * - customer.subscription.trial_will_end (Stripe sends it 3 days before the trial ends) → email (no app push: owner
 *   11-23 — the email before a charge is enough)
 * - invoice.upcoming for an ANNUAL plan (Stripe Dashboard → Billing → Subscriptions → "Upcoming renewal events" = 7
 *   days) → email. Monthly / 3-month renewals get no reminder.
 * Both say the price, the date, how to cancel, and the 7-day refund rule.
 * Parent-paid subscriptions (metadata payer_uid) are skipped here: their reminders go to the PAYING parent from the
 * daily family job with the parent lead times (annual / 3-month 7 days, monthly 3 days, trial 2 days) —
 * src/lib/family/daily.server.ts + sendRenewalMail in src/lib/family/mail.server.ts.
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

export async function sendTrialEndingNotice(subscriptionId: string) {
  const stripe = getStripe()
  if (!stripe) return
  // Re-read: a late or retried event must not remind someone who already canceled or whose trial already ended.
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const uid = sub.metadata?.user_uid
  const item = sub.items?.data?.[0]
  if (sub.metadata?.payer_uid) return
  if (!uid || !(await isPremiumPrice(item?.price)) || sub.status !== 'trialing' || !sub.trial_end || sub.cancel_at_period_end) return
  // What will really be charged (discounts, tax), falling back to the list price.
  const upcoming = await stripe.invoices
    .retrieveUpcoming({ subscription: sub.id })
    .catch(() => null)
  const price = money(upcoming?.amount_due ?? item?.price?.unit_amount ?? 0, upcoming?.currency ?? item?.price?.currency)
  const { locale, email } = await recipient(uid, sub.metadata?.email)
  const date = dateIn(locale, sub.trial_end)
  const t = await getT(locale, 'premium')
  const url = `${siteUrl()}/${locale}/nyc/premium`

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
  if (sub.metadata?.payer_uid) return
  const subPrice = sub.items?.data?.[0]?.price
  const annual = subPrice?.recurring?.interval === 'year'
  if (!uid || !(await isPremiumPrice(subPrice)) || !annual || sub.status !== 'active' || sub.cancel_at_period_end) return
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
