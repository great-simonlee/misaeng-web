'use client'

import { useState } from 'react'

/** Receipt page buttons: Print, and "Request a refund" while the purchase is still refundable. */
export function AgentReceiptActions(props: { id: string; k: string; refundable: boolean; requested: boolean; vi: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(props.requested ? 'done' : 'idle')
  const [error, setError] = useState('')
  const t = props.vi
    ? { print: 'In / lưu PDF', refund: 'Yêu cầu hoàn tiền', reason: 'Lý do (không bắt buộc)', send: 'Gửi yêu cầu', done: 'Đã gửi yêu cầu hoàn tiền. Đội ngũ Misaeng sẽ xử lý sớm.' }
    : { print: 'Print / save as PDF', refund: 'Request a refund', reason: 'Reason (optional)', send: 'Send request', done: 'Refund requested. The Misaeng team will review it shortly.' }

  async function send() {
    setState('busy')
    setError('')
    const res = await fetch('/api/credits/refund-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: props.id, k: props.k, reason }),
    }).catch(() => null)
    const data = (await res?.json().catch(() => ({}))) as { error?: string }
    if (res?.ok) setState('done')
    else {
      setState('error')
      setError(data?.error || 'Something went wrong.')
    }
  }

  return (
    <div className='mt-6 space-y-3 print:hidden'>
      <button type='button' onClick={() => window.print()} className='rounded-full bg-[#0057D9] px-5 py-2 text-sm font-bold text-white'>
        {t.print}
      </button>
      {state === 'done' ? <p className='text-sm text-emerald-700'>{t.done}</p> : null}
      {props.refundable && state !== 'done' ? (
        open ? (
          <div className='space-y-2 rounded-xl border border-[#E8EAF0] p-3'>
            <textarea
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reason}
              className='w-full rounded-lg border border-[#E8EAF0] p-2 text-sm'
            />
            <button type='button' disabled={state === 'busy'} onClick={() => void send()} className='rounded-full bg-[#12131A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
              {t.send}
            </button>
            {error ? <p className='text-sm text-red-600'>{error}</p> : null}
          </div>
        ) : (
          <button type='button' onClick={() => setOpen(true)} className='block text-sm font-semibold text-[#0057D9] underline'>
            {t.refund}
          </button>
        )
      ) : null}
    </div>
  )
}
