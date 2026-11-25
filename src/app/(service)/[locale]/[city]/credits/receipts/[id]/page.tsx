import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BRAND_CONFIG } from '@lib/brand'
import { checkReceiptKey, getCreditsConfig, getPurchase, isRefundable } from '@lib/ellieo/credits.server'
import { EllieoReceiptActions } from '@screens/ellieo/EllieoReceiptActions'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; city: string; id: string }>
  searchParams: Promise<{ k?: string }>
}

export const metadata: Metadata = { title: 'Receipt', robots: { index: false } }

const STATUS: Record<string, string> = {
  paid: 'Paid',
  refund_requested: 'Paid · refund requested',
  refunded: 'Refunded',
  disputed: 'Disputed',
  reversed: 'Reversed',
}

/** Printable receipt for one credit pack (for expense reports). Opened with the signed link (?k=). */
export default async function EllieoReceiptPage({ params, searchParams }: Props) {
  if (BRAND_CONFIG.theme !== 'ellieo') notFound()
  const [{ id, locale }, { k }] = await Promise.all([params, searchParams])
  if (!checkReceiptKey(id, k)) notFound()
  const purchase = await getPurchase(id)
  if (!purchase) notFound()
  const [config, refundable] = await Promise.all([getCreditsConfig(), isRefundable(id)])
  const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const date = new Date(purchase.created_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' })
  return (
    <main className='mx-auto w-full max-w-xl px-4 py-10 text-[#12131A]'>
      <div className='rounded-2xl border border-[#E8EAF0] bg-white p-6 print:border-0 print:p-0'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-[#5B6070]'>Receipt</p>
            <h1 className='mt-1 text-2xl font-bold'>Ellieo credits</h1>
          </div>
          <p className='text-right text-xs text-[#5B6070]'>
            #{purchase.id.slice(0, 8).toUpperCase()}
            <br />
            {date} (ET)
          </p>
        </div>
        <div className='mt-6 grid grid-cols-2 gap-4 text-sm'>
          <div>
            <p className='text-xs font-semibold text-[#5B6070]'>From</p>
            <p className='font-semibold'>{config.seller.name}</p>
            <p className='whitespace-pre-line text-[#3A4256]'>{config.seller.address}</p>
            <p className='text-[#3A4256]'>{config.seller.email}</p>
          </div>
          <div>
            <p className='text-xs font-semibold text-[#5B6070]'>Billed to</p>
            <p className='font-semibold'>{purchase.buyer_name || purchase.buyer_email || 'Ellieo member'}</p>
            {purchase.brokerage ? <p className='text-[#3A4256]'>{purchase.brokerage}</p> : null}
            {purchase.buyer_email ? <p className='text-[#3A4256]'>{purchase.buyer_email}</p> : null}
          </div>
        </div>
        <table className='mt-6 w-full text-sm'>
          <thead>
            <tr className='border-b border-[#E8EAF0] text-left text-xs text-[#5B6070]'>
              <th className='py-2'>Item</th>
              <th className='py-2 text-right'>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className='border-b border-[#E8EAF0]'>
              <td className='py-2'>Ellieo credits · {purchase.credits} credits</td>
              <td className='py-2 text-right'>{usd(purchase.amount_cents)}</td>
            </tr>
            {purchase.tax_cents > 0 ? (
              <tr className='border-b border-[#E8EAF0]'>
                <td className='py-2'>Sales tax</td>
                <td className='py-2 text-right'>{usd(purchase.tax_cents)}</td>
              </tr>
            ) : null}
            <tr>
              <td className='py-2 font-bold'>Total ({purchase.currency.toUpperCase()})</td>
              <td className='py-2 text-right font-bold'>{usd(purchase.amount_cents + purchase.tax_cents)}</td>
            </tr>
          </tbody>
        </table>
        <div className='mt-4 text-sm text-[#3A4256]'>
          <p>Payment method: {purchase.card_last4 ? `${(purchase.card_brand ?? 'Card').toUpperCase()} ending ${purchase.card_last4}` : 'Card'}</p>
          <p>Status: {STATUS[purchase.status] ?? purchase.status}</p>
          {purchase.receipt_url ? (
            <p className='print:hidden'>
              <a className='text-[#0057D9] underline' href={purchase.receipt_url}>
                Stripe receipt
              </a>
            </p>
          ) : null}
        </div>
        <p className='mt-6 text-xs text-[#5B6070]'>
          Paid credits never expire. Refunds: within {config.refundDays} days of purchase if none of this pack’s credits were used (full refunds only).
        </p>
      </div>
      <EllieoReceiptActions
        id={purchase.id}
        k={k!}
        refundable={refundable && purchase.status === 'paid'}
        requested={purchase.status === 'refund_requested'}
        vi={locale === 'vi'}
      />
    </main>
  )
}
