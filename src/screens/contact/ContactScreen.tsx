'use client'

import { useState, useEffect } from 'react'
import { send } from '@emailjs/browser'

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_2q2yz67'

/** 전송 성공 후 같은 사용자가 연속 전송할 수 없는 대기 시간(초) */
const COOLDOWN_SECONDS = 60

/** 성공/실패 메시지를 보여 주는 시간(초), 이후 자동 숨김 */
const TOAST_DURATION_SECONDS = 5

/** 메시지 필드 최대 글자 수 (이메일 가독성·스팸 완화용) */
const MESSAGE_MAX_LENGTH = 2000

/** 관리자에게 보내는 문의 메일 템플릿. .env.local에 없으면 아래 기본값 사용 */
const getAdminTemplateId = () =>
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_ADMIN || 'template_i09sdw'

/** 문의 보낸 사람에게 확인 이메일을 보낼 때 사용. .env.local에 NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION 설정 시에만 전송됨. */
const getConfirmationTemplateId = () => process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION || ''

export function ContactScreen() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          setStatus('idle')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownRemaining])

  useEffect(() => {
    if (status !== 'error') return
    const t = setTimeout(() => setStatus('idle'), TOAST_DURATION_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [status])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
    if (!publicKey) {
      console.error('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY is missing in .env.local')
      setStatus('error')
      return
    }

    const name = (formData.get('name') as string) || ''
    const email = (formData.get('email') as string) || ''
    const message = (formData.get('message') as string) || ''
    const templateParams = { name, email, message }
    const sendOptions = { publicKey }

    setStatus('sending')
    try {
      const confirmationTemplateId = getConfirmationTemplateId()

      if (confirmationTemplateId) {
        await Promise.all([
          send(EMAILJS_SERVICE_ID, getAdminTemplateId(), templateParams, sendOptions),
          send(EMAILJS_SERVICE_ID, confirmationTemplateId, templateParams, sendOptions),
        ])
      } else {
        await send(EMAILJS_SERVICE_ID, getAdminTemplateId(), templateParams, sendOptions)
      }

      setStatus('success')
      setCooldownRemaining(COOLDOWN_SECONDS)
      setMessageText('')
      form.reset()
    } catch (err) {
      const detail = err && typeof err === 'object' && 'status' in err ? `${(err as { status: number }).status} ${(err as { text?: string }).text ?? ''}` : String(err)
      console.error('EmailJS error:', detail, err)
      setStatus('error')
    }
  }

  const isSubmitDisabled = status === 'sending' || cooldownRemaining > 0

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ─── Send a message: 첫 파트 텍스트 통합 + 다크 풀블리드 + 글래스 폼 ─── */}
      <section
        className="relative min-h-screen overflow-hidden py-8 sm:py-8 lg:py-10"
        style={{ background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(246,67,16,0.15),transparent_50%)]"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" aria-hidden />
        <div className="relative mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          {/* Contact · Reach out first · 문단 · 알약 */}
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-[#F64310]">
            Contact
          </p>
          <h1 className="mt-4 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            Reach out first.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-white/70 sm:text-base">
            Partnerships, job applications, ideas, or questions—we want to hear from you. Get in
            touch and our team in New York will respond.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8 sm:gap-3">
            {['Business Partnerships', 'Job Applications', 'Investment', 'General Inquiries', 'Campus & Institutions', 'Feedback & Ideas'].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium text-white/95 transition hover:border-[#F64310]/50 hover:bg-white/15 sm:text-sm"
                >
                  {label}
                </span>
              )
            )}
          </div>

          {/* 폼 카드: 세로 배치(Name, Email), 주황 보더 제거 */}
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-xl sm:mt-10">
            <div className="p-6 sm:p-8">
              <form
                className="space-y-5"
                onSubmit={handleSubmit}
              >
                <div>
                  <label htmlFor="contact-name" className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 transition focus:border-[#F64310]/60 focus:bg-white/10 focus:ring-2 focus:ring-[#F64310]/20"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 transition focus:border-[#F64310]/60 focus:bg-white/10 focus:ring-2 focus:ring-[#F64310]/20"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    maxLength={MESSAGE_MAX_LENGTH}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Partnership idea, job interest, or question…"
                    className="mt-1.5 w-full resize-none rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35 transition focus:border-[#F64310]/60 focus:bg-white/10 focus:ring-2 focus:ring-[#F64310]/20"
                  />
                  <p className="mt-1 text-right text-[10px] text-white/40" aria-live="polite">
                    {messageText.length} / {MESSAGE_MAX_LENGTH}
                  </p>
                </div>
                {!(status === 'success' && cooldownRemaining > 0) && (
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="animate-shimmer mt-1 w-full cursor-pointer rounded-lg px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#F64310]/25 transition duration-300 hover:shadow-[#F64310]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F64310] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e293b] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {status === 'sending' ? 'Sending…' : 'Send message →'}
                  </button>
                )}
              </form>
              {status === 'success' && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/15 px-5 py-5 text-center shadow-lg shadow-emerald-500/10"
                >
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/30 text-2xl text-emerald-400"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <p className="mt-3 text-base font-bold text-emerald-400 sm:text-lg">
                    Your message was sent successfully.
                  </p>
                  <p className="mt-2 text-sm text-white/90">
                    We&apos;ve sent a confirmation email. We&apos;ll reply within 24–48 hours.
                  </p>
                  {cooldownRemaining > 0 && (
                    <p className="mt-2 text-xs text-white/60">
                      You can send another message in {cooldownRemaining} seconds.
                    </p>
                  )}
                </div>
              )}
              {status === 'error' && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border-2 border-red-500/60 bg-red-500/15 px-5 py-4 text-center shadow-lg shadow-red-500/10"
                >
                  <p className="text-sm font-semibold text-red-400">
                    Something went wrong. Please try again or email us directly.
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    Closing in {TOAST_DURATION_SECONDS} seconds…
                  </p>
                </div>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/45">
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-white/30 bg-white/5" aria-hidden />
                We typically reply within 24 hours
              </p>
              <p className="mt-3 text-center text-xs text-white/40">
                Or email us at{' '}
                <a href="mailto:info@misaeng.com" className="text-white/70 underline hover:text-[#F64310]">
                  info@misaeng.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom tagline (유지) ─── */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-[var(--muted-foreground)] sm:text-base">
            We’re in New York. We read every message.
          </p>
        </div>
      </section>
    </div>
  )
}
