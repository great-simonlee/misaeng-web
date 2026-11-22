'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cityLoginPath } from '@lib/constants/cities'
import { useFormat, useT } from '@lib/i18n/client'
import { PremiumRequestError, fetchPremiumMe, redeemPremiumCode, type PremiumMe } from '@lib/premium/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

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

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('code')
    if (preset) setCode(preset.toUpperCase().slice(0, 32))
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
    if (!code.trim()) return
    setBusy(true)
    try {
      const result = await redeemPremiumCode(code)
      setUntil(result.until)
    } catch (e) {
      const key = e instanceof PremiumRequestError ? e.message : ''
      setError(t(`redeem.errors.${(ERROR_CODES as readonly string[]).includes(key) ? key : 'FAILED'}`))
    } finally {
      setBusy(false)
    }
  }

  const date = (iso: string | null) => (iso ? fmt.date(iso, { year: 'numeric', month: 'long', day: 'numeric' }) : '')

  return (
    <BoardPageShell>
      <div className='mx-auto flex w-full max-w-[520px] flex-col gap-6 px-1 pb-20 pt-8'>
        {until ? (
          <section className='flex flex-col items-center gap-3 rounded-[30px] bg-[linear-gradient(140deg,#DDF5EA,#F2FBF6)] px-6 py-10 text-center'>
            <p className='text-[24px] font-black tracking-tight text-[#065F46]'>{t('redeem.successTitle')}</p>
            <p className='text-[15px] leading-relaxed text-[#047857]'>{t('redeem.successBody', { date: date(until) })}</p>
            <Link
              href={href('/companies')}
              className='mt-2 inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-bold text-[#065F46] shadow-sm'
            >
              {t('redeem.goCompanies')}
            </Link>
          </section>
        ) : (
          <section className='flex flex-col gap-5 rounded-[30px] bg-[linear-gradient(140deg,#FFE3D3_0%,#FFF1E6_45%,#FFF9F2_100%)] px-6 py-9 sm:px-8'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-[28px] font-black tracking-tight text-[var(--foreground)]'>{t('redeem.title')}</h1>
              <p className='text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{t('redeem.sub')}</p>
            </div>
            {loading ? (
              <div className='py-6'>
                <LoadingState label='' />
              </div>
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
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t('redeem.placeholder')}
                    autoComplete='off'
                    autoCapitalize='characters'
                    spellCheck={false}
                    maxLength={32}
                    className='h-14 rounded-2xl border-2 border-transparent bg-white px-4 text-[18px] font-bold tracking-[0.08em] text-[var(--foreground)] outline-none placeholder:font-semibold placeholder:tracking-normal placeholder:text-[var(--muted)] focus:border-[var(--brand)]'
                  />
                </label>
                <button
                  type='submit'
                  disabled={busy || (me?.loggedIn && !code.trim())}
                  className='h-14 rounded-2xl bg-[var(--brand)] text-[17px] font-extrabold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60'
                >
                  {busy ? t('redeem.loading') : me?.loggedIn ? t('redeem.submit') : t('redeem.login')}
                </button>
                {error ? <p className='text-center text-[13px] font-semibold text-[#DC2626]'>{error}</p> : null}
              </form>
            )}
            <p className='text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('redeem.rules')}</p>
          </section>
        )}
        <Link href={href('/premium')} className='text-center text-[14px] font-bold text-[var(--brand)] underline-offset-2 hover:underline'>
          {t('redeem.back')}
        </Link>
      </div>
    </BoardPageShell>
  )
}
