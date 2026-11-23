'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cityLoginPath } from '@lib/constants/cities'
import { useFormat, useT } from '@lib/i18n/client'
import { PremiumRequestError, fetchPremiumMe, redeemPremiumCode, type PremiumMe } from '@lib/premium/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

import { BellIcon, ChartIcon, CoinIcon, KEYFRAMES, Mascot, ShieldIcon, TONES } from './PremiumScreen'
import { byBrand } from '@lib/brand/design'

/**
 * /premium/redeem — enter a Premium code (student council / partner / random). Shareable as
 * /premium/redeem?code=NYUKSA2026 (prefilled). Web only; the apps never show a code field (App Store 3.1.1).
 */

const ERROR_CODES = [
  'INVALID',
  'NOT_FOUND',
  'PAUSED',
  'CLOSED',
  'REDEEM_ENDED',
  'USED_UP',
  'ALREADY_USED',
  'ALREADY_PREMIUM',
  'EXPIRED',
  'TOO_MANY',
] as const

export function PremiumRedeemScreen() {
  const t = useT('premium')
  const fmt = useFormat()
  const city = useCity()
  const href = useCityPath()
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<PremiumMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [until, setUntil] = useState<string | null>(null)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('code')
    if (preset) setCode(preset.toUpperCase().slice(0, 32))
    // Local design review: ?preview=success shows the redeemed state without using a code
    if (process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).get('preview') === 'success') {
      setUntil(new Date(Date.now() + 30 * 86_400_000).toISOString())
    }
    void fetchPremiumMe().then((next) => {
      setMe(next)
      setLoading(false)
    })
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!me?.loggedIn) {
      const next = code.trim() ? `${pathname}?code=${encodeURIComponent(code.trim())}` : pathname
      router.push(cityLoginPath(city, next))
      return
    }
    if (!code.trim()) {
      codeInput.current?.focus()
      return
    }
    setBusy(true)
    try {
      const result = await redeemPremiumCode(code)
      setUntil(result.until)
    } catch (e) {
      if (e instanceof PremiumRequestError && e.status === 401) {
        // Session expired: log in again and come back with the code filled in.
        router.push(cityLoginPath(city, `${pathname}?code=${encodeURIComponent(code.trim())}`))
        return
      }
      const key = e instanceof PremiumRequestError ? e.message : ''
      setError(t(`redeem.errors.${(ERROR_CODES as readonly string[]).includes(key) ? key : 'FAILED'}`))
    } finally {
      setBusy(false)
    }
  }

  const date = (iso: string | null) => (iso ? fmt.date(iso, { year: 'numeric', month: 'long', day: 'numeric' }) : '')

  const unlocks = (
    <ul className='flex flex-col gap-2.5'>
      {UNLOCKS.map(({ k, tone, Icon }) => {
        const c = TONES[tone]
        return (
          <li key={k} className={`flex items-center gap-3 rounded-[18px] ${c.bg} px-3.5 py-3`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${c.blob} ${c.ink} [&_svg]:h-5 [&_svg]:w-5`}>
              <Icon />
            </span>
            <span className='text-[14.5px] font-bold tracking-tight text-[var(--foreground)]'>{t(`benefits.${k}.title`)}</span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <BoardPageShell width='wide'>
      <style>{KEYFRAMES}</style>
      <div className={byBrand('flex w-full flex-col gap-6 pb-20 pt-4 sm:pt-5 lg:pt-6', 'mx-auto flex w-full max-w-[960px] flex-col gap-6 px-1 pb-20 pt-4 sm:pt-5 lg:pt-6')}>
        {until ? (
          <section className='premium-pop mx-auto flex w-full max-w-[560px] flex-col items-center gap-5 rounded-[32px] bg-white px-6 pb-8 pt-10 text-center shadow-[0_24px_60px_-32px_rgba(246,67,16,0.45)] ring-1 ring-[#F6E4DA] sm:px-10'>
            <div className='relative rounded-full bg-[radial-gradient(circle,#FFE3D3_0%,#FFF6EE_60%,transparent_72%)] p-3'>
              <div className='premium-float'>
                <Mascot small />
              </div>
              <span className='absolute bottom-3 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#059669] text-white ring-4 ring-white'>
                <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
                  <path d='M5 12.5l4.5 4.5L19 7.5' />
                </svg>
              </span>
            </div>
            <div className='flex flex-col items-center gap-2'>
              <h1 className='text-[28px] font-black tracking-tight text-[var(--foreground)]'>{t('redeem.successTitle')}</h1>
              <span className='rounded-full bg-[#FFF1E8] px-3.5 py-1 text-[13.5px] font-extrabold text-[var(--brand)]'>
                {t('redeem.until', { date: date(until) })}
              </span>
              <p className='max-w-[420px] text-[14.5px] leading-relaxed text-[var(--muted-foreground)]'>
                {t('redeem.successNote')}
              </p>
            </div>
            <div className='w-full text-left'>
              <p className='mb-2.5 px-1 text-[13px] font-bold text-[var(--muted-foreground)]'>{t('redeem.successUnlocked')}</p>
              {unlocks}
            </div>
            <div className='flex w-full flex-col gap-2.5 sm:flex-row'>
              <Link
                href={href('/companies')}
                className='flex h-14 flex-1 items-center justify-center rounded-2xl bg-[var(--brand)] text-[16px] font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)]'
              >
                {t('redeem.goCompanies')}
              </Link>
              <Link
                href={href('/premium')}
                className='flex h-14 flex-1 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[15px] font-bold text-[var(--foreground)] transition hover:bg-[#ECEEF1]'
              >
                {t('redeem.back')}
              </Link>
            </div>
          </section>
        ) : (
          <div className='grid w-full items-stretch gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'>
            <section className='relative flex flex-col gap-6 overflow-hidden rounded-[32px] bg-[linear-gradient(140deg,#FFE3D3_0%,#FFF1E6_45%,#FFF9F2_100%)] px-6 py-9 sm:px-9'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex flex-col gap-2.5'>
                  <span className='w-fit rounded-full bg-white/80 px-3 py-1 text-[12px] font-extrabold tracking-wide text-[var(--brand)]'>
                    {t('redeem.noCard')}
                  </span>
                  <h1 className='text-[28px] font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-[32px]'>{t('redeem.title')}</h1>
                  <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{t('redeem.sub')}</p>
                </div>
                <div className='premium-float hidden shrink-0 sm:block'>
                  <Mascot small />
                </div>
              </div>
              {loading ? (
                <div className='py-6'>
                  <LoadingState label='' />
                </div>
              ) : me?.degraded ? (
                <p className='rounded-2xl bg-white/80 px-4 py-3.5 text-[14px] font-semibold text-[var(--foreground)]'>
                  {t('errors.stateUnavailable')}
                </p>
              ) : me?.premium && me.source !== 'staff' ? (
                <p className='rounded-2xl bg-white/80 px-4 py-3.5 text-[14px] font-semibold text-[var(--foreground)]'>
                  {t('redeem.errors.ALREADY_PREMIUM')}
                  {me.until ? ` (${date(me.until)})` : ''}
                </p>
              ) : (
                <form onSubmit={submit} className='flex flex-col gap-3'>
                  <label className='flex flex-col gap-1.5'>
                    <span className='px-1 text-[13px] font-bold text-[var(--foreground)]'>{t('redeem.label')}</span>
                    <input
                      ref={codeInput}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder={t('redeem.placeholder')}
                      autoComplete='off'
                      autoCapitalize='characters'
                      spellCheck={false}
                      maxLength={32}
                      aria-invalid={Boolean(error)}
                      className={`h-16 rounded-2xl border-2 bg-white px-5 text-[20px] font-extrabold tracking-[0.12em] text-[var(--foreground)] shadow-[0_6px_20px_-14px_rgba(15,23,42,0.4)] outline-none transition placeholder:text-[16px] placeholder:font-semibold placeholder:tracking-normal placeholder:text-[var(--muted)] focus:border-[var(--brand)] ${error ? 'border-[#DC2626]' : 'border-transparent'}`}
                    />
                  </label>
                  {error ? <p className='px-1 text-[13px] font-semibold text-[#DC2626]'>{error}</p> : null}
                  <button
                    type='submit'
                    disabled={busy}
                    className='premium-press h-14 rounded-2xl bg-[var(--brand)] text-[17px] font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)] disabled:opacity-60 disabled:shadow-none'
                  >
                    {busy ? t('redeem.loading') : me?.loggedIn ? t('redeem.submit') : t('redeem.login')}
                  </button>
                </form>
              )}
              <p className='text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('redeem.rules')}</p>
            </section>

            <aside className='flex flex-col gap-4 rounded-[32px] bg-white px-6 py-8 ring-1 ring-[#F0F1F3] sm:px-8'>
              <h2 className='text-[18px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('redeem.unlocksTitle')}</h2>
              {unlocks}
              <Link
                href={href('/premium')}
                className='mt-auto inline-flex items-center gap-1 self-start pt-2 text-[14px] font-bold text-[var(--brand)] underline-offset-2 hover:underline'
              >
                {t('redeem.back')}
                <span aria-hidden>→</span>
              </Link>
            </aside>
          </div>
        )}
      </div>
    </BoardPageShell>
  )
}

const UNLOCKS = [
  { k: 'visa', tone: 'peach', Icon: ChartIcon },
  { k: 'salary', tone: 'mint', Icon: CoinIcon },
  { k: 'policy', tone: 'sky', Icon: ShieldIcon },
  { k: 'alerts', tone: 'lilac', Icon: BellIcon },
] as const
