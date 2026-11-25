'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * ellieo.com/credits — buy credit packs with Stripe Checkout (the app's "Top up" opens this with a signed ?t= token).
 * Payments stay off until Ellieo's Stripe keys are set: then this shows "Payments coming soon".
 */

export type TopUpPack = {
  id: string
  priceCents: number
  credits: number
  bonus: number
  hint: string
  hintVi: string
}

const TEXT = {
  en: {
    title: 'Top up credits',
    lead: 'Credits pay for brokered listings and Premium (Boost) on Ellieo. Paid credits never expire.',
    soon: 'Payments coming soon',
    soonBody: 'Buying credits online opens soon. Need credits now? Email info@ellieo.com and our team will add them.',
    bonus: (n: number) => `+${n} bonus`,
    buy: 'Buy',
    credits: 'credits',
    tax: (rate: string) => `Sales tax (${rate}%) is added at checkout.`,
    signIn: 'Open Ellieo in the app and tap Top up, or sign in on ellieo.com to buy credits.',
    paid: 'Payment received — your credits will appear in a moment.',
    added: (n: number) => `${n} credits added to your account.`,
    receipt: 'View receipt',
    canceled: 'Checkout canceled. Nothing was charged.',
    summaryTitle: 'Good to know',
    summary: [
      '1 credit = $1. Paid credits never expire; free reward credits expire after 90 days and are used first.',
      'Refund: within 7 days of purchase if none of that pack’s credits were used — full refunds only, from your receipt.',
      'Premium (Boost) days are not refunded when a listing is marked rented or removed for breaking the rules.',
      'Licensed agents are responsible for listing accuracy and fair-housing and advertising rules (brokerage name, fees).',
    ],
    terms: 'Terms: Ellieo credits and paid listings',
    error: 'Something went wrong. Try again.',
  },
  vi: {
    title: 'Nạp credit',
    lead: 'Credit dùng để đăng tin qua môi giới và Premium (Boost) trên Ellieo. Credit đã mua không hết hạn.',
    soon: 'Thanh toán sắp có',
    soonBody: 'Tính năng mua credit trực tuyến sắp ra mắt. Cần credit ngay? Gửi email tới info@ellieo.com, đội ngũ Ellieo sẽ thêm cho bạn.',
    bonus: (n: number) => `+${n} thưởng`,
    buy: 'Mua',
    credits: 'credit',
    tax: (rate: string) => `Thuế bán hàng (${rate}%) được cộng khi thanh toán.`,
    signIn: 'Mở ứng dụng Ellieo và nhấn Nạp credit, hoặc đăng nhập trên ellieo.com để mua credit.',
    paid: 'Đã nhận thanh toán — credit sẽ vào tài khoản trong giây lát.',
    added: (n: number) => `Đã thêm ${n} credit vào tài khoản của bạn.`,
    receipt: 'Xem hóa đơn',
    canceled: 'Đã hủy thanh toán. Bạn chưa bị trừ tiền.',
    summaryTitle: 'Cần biết',
    summary: [
      '1 credit = $1. Credit đã mua không hết hạn; credit thưởng miễn phí hết hạn sau 90 ngày và được dùng trước.',
      'Hoàn tiền: trong vòng 7 ngày kể từ khi mua nếu chưa dùng credit nào của gói đó — chỉ hoàn toàn bộ, yêu cầu từ hóa đơn.',
      'Số ngày Premium (Boost) không được hoàn khi tin được đánh dấu đã cho thuê hoặc bị gỡ do vi phạm quy định.',
      'Môi giới có giấy phép chịu trách nhiệm về độ chính xác của tin và quy định nhà ở công bằng, quảng cáo (tên công ty môi giới, phí).',
    ],
    terms: 'Điều khoản: Credit Ellieo và tin đăng trả phí',
    error: 'Đã có lỗi. Vui lòng thử lại.',
  },
} as const

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function EllieoTopUpScreen(props: {
  locale: string
  packs: TopUpPack[]
  paymentsEnabled: boolean
  salesTaxRate: number
  termsHref: string
}) {
  const text = props.locale === 'vi' ? TEXT.vi : TEXT.en
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | 'info'; text: string; receipt?: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('t')
    if (t) {
      try {
        sessionStorage.setItem('ellieo-topup-token', t)
      } catch {}
    }
    let stored: string | null = null
    try {
      stored = sessionStorage.getItem('ellieo-topup-token')
    } catch {}
    setToken(t || stored)
    if (params.get('canceled')) setMessage({ tone: 'info', text: text.canceled })
    const session = params.get('session')
    if (params.get('paid') && session) {
      setMessage({ tone: 'ok', text: text.paid })
      let tries = 0
      const poll = async () => {
        tries += 1
        const q = new URLSearchParams({ id: session, ...(t || stored ? { t: (t || stored)! } : {}) })
        const res = await fetch(`/api/ellieo/credits/session?${q}`).catch(() => null)
        const data = (await res?.json().catch(() => null)) as { done?: boolean; credits?: number; receipt?: string } | null
        if (data?.done) setMessage({ tone: 'ok', text: text.added(data.credits ?? 0), receipt: data.receipt })
        else if (tries < 10) setTimeout(poll, 2000)
      }
      void poll()
    }
  }, [text])

  async function buy(pack: TopUpPack) {
    setBusy(pack.id)
    setMessage(null)
    try {
      const res = await fetch('/api/ellieo/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: pack.id, t: token, locale: props.locale }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string }
      if (res.status === 401) throw new Error(text.signIn)
      if (!res.ok || !data.url) throw new Error(data.error || text.error)
      window.location.href = data.url
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : text.error })
      setBusy(null)
    }
  }

  const tone = { ok: 'border-emerald-200 bg-emerald-50 text-emerald-800', error: 'border-red-200 bg-red-50 text-red-700', info: 'border-slate-200 bg-slate-50 text-slate-700' }

  return (
    <main className='mx-auto w-full max-w-xl px-4 py-10'>
      <h1 className='text-3xl font-bold text-[#12131A]'>{text.title}</h1>
      <p className='mt-2 text-sm text-[#3A4256]'>{text.lead}</p>
      {message ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${tone[message.tone]}`}>
          {message.text}
          {message.receipt ? (
            <Link href={message.receipt} className='ml-2 font-semibold underline'>
              {text.receipt}
            </Link>
          ) : null}
        </div>
      ) : null}
      {!props.paymentsEnabled ? (
        <div className='mt-6 rounded-2xl border border-[#FFD60A] bg-[#FFFBEA] p-4'>
          <p className='text-sm font-bold text-[#12131A]'>{text.soon}</p>
          <p className='mt-1 text-sm text-[#3A4256]'>
            {text.soonBody.split('info@ellieo.com')[0]}
            <a className='font-semibold text-[#0057D9]' href='mailto:info@ellieo.com'>
              info@ellieo.com
            </a>
            {text.soonBody.split('info@ellieo.com')[1]}
          </p>
        </div>
      ) : null}
      <ul className='mt-6 space-y-3'>
        {props.packs.map((pack) => (
          <li key={pack.id} className='flex items-center gap-4 rounded-2xl border border-[#E8EAF0] bg-white p-4'>
            <div className='min-w-0 flex-1'>
              <p className='text-lg font-bold text-[#12131A]'>
                {pack.credits} {text.credits}
                {pack.bonus > 0 ? (
                  <span className='ml-2 rounded-md bg-[#FFD60A] px-2 py-0.5 text-xs font-bold text-[#12131A]'>{text.bonus(pack.bonus)}</span>
                ) : null}
              </p>
              <p className='mt-0.5 text-xs text-[#5B6070]'>{props.locale === 'vi' ? pack.hintVi : pack.hint}</p>
            </div>
            <button
              type='button'
              disabled={!props.paymentsEnabled || busy !== null}
              onClick={() => void buy(pack)}
              className='shrink-0 rounded-full bg-[#0057D9] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40'
            >
              {busy === pack.id ? '…' : `${text.buy} · ${dollars(pack.priceCents)}`}
            </button>
          </li>
        ))}
      </ul>
      {props.salesTaxRate > 0 ? (
        <p className='mt-3 text-xs text-[#5B6070]'>{text.tax((props.salesTaxRate * 100).toFixed(3).replace(/\.?0+$/, ''))}</p>
      ) : null}
      <section className='mt-8 rounded-2xl bg-[#F3F5F9] p-4'>
        <h2 className='text-sm font-bold text-[#12131A]'>{text.summaryTitle}</h2>
        <ul className='mt-2 list-disc space-y-1 pl-5 text-xs text-[#3A4256]'>
          {text.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Link href={props.termsHref} className='mt-3 inline-block text-xs font-semibold text-[#0057D9]'>
          {text.terms} →
        </Link>
      </section>
    </main>
  )
}
