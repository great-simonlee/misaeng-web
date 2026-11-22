'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cityLoginPath } from '@lib/constants/cities'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import { rich } from '@lib/i18n/rich'
import {
  PremiumRequestError,
  fetchPremiumMe,
  openBillingPortal,
  startCheckout,
  type PremiumMe,
  type PremiumPlanId,
} from '@lib/premium/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

/**
 * /premium — the web paywall (Stripe). Benefits first and big, then the plan picker (annual preselected), the
 * auto-renew disclosure and FAQ. Premium members see their plan and "구독 관리" (Stripe billing portal) instead.
 * Soft peach / cream pastels around the brand orange, a little passport mascot, bouncy but reduced-motion safe.
 */

const PLANS: PremiumPlanId[] = ['annual', 'season', 'monthly']
const PRICE: Record<PremiumPlanId, string> = { annual: '$179.99', season: '$59.99', monthly: '$29.99' }
const TRIAL_DAYS = 7

type CheckoutStatus = 'success' | 'cancel' | null

export function PremiumScreen() {
  const t = useT('premium')
  const fmt = useFormat()
  const locale = useLocale()
  const city = useCity()
  const href = useCityPath()
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<PremiumMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PremiumPlanId>('annual')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<CheckoutStatus>(null)
  // Trial end shown in the disclosure: fixed when the page opens (no Date.now() during render).
  const [trialEndAt] = useState(() => Date.now() + TRIAL_DAYS * 86_400_000)

  const load = useCallback(async () => {
    const next = await fetchPremiumMe()
    setMe(next)
    setLoading(false)
    return next
  }, [])

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('status')
    const checkout: CheckoutStatus = value === 'success' || value === 'cancel' ? value : null
    let alive = true
    void (async () => {
      let next = await load()
      if (alive) setStatus(checkout)
      // The webhook can land a few seconds after Stripe sends the member back: check again for a little while.
      for (let i = 0; checkout === 'success' && alive && !next?.premium && i < 6; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        next = await load()
      }
    })()
    return () => {
      alive = false
    }
  }, [load])

  async function start() {
    setError('')
    if (!me?.loggedIn) {
      router.push(cityLoginPath(city, pathname))
      return
    }
    setBusy(true)
    try {
      const { url } = await startCheckout(plan, city, locale)
      window.location.assign(url)
    } catch (e) {
      setBusy(false)
      const code = e instanceof PremiumRequestError ? e.status : 0
      setError(code === 503 ? t('errors.notReady') : code === 409 ? t('errors.already') : t('errors.failed'))
      if (code === 409) void load()
    }
  }

  async function manage() {
    setBusy(true)
    try {
      const { url } = await openBillingPortal(city, locale)
      window.location.assign(url)
    } catch {
      setBusy(false)
      setError(t('errors.failed'))
    }
  }

  const trial = me?.trialAvailable ?? true
  const trialEnd = fmt.date(trialEndAt, { month: 'long', day: 'numeric' })

  return (
    <BoardPageShell width='wide'>
      <style>{KEYFRAMES}</style>
      <div className='mx-auto flex w-full max-w-[880px] flex-col gap-10 pb-20 pt-4'>
        {status ? <StatusBanner status={status} premium={Boolean(me?.premium)} companiesHref={href('/companies')} /> : null}

        <Hero />

        <section className='flex flex-col gap-4'>
          <h2 className='px-1 text-[22px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('benefits.title')}</h2>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Benefit tone='peach' icon={<ChartIcon />} k='visa' />
            <Benefit tone='mint' icon={<CoinIcon />} k='salary' />
            <Benefit tone='sky' icon={<ShieldIcon />} k='policy' />
            <Benefit tone='lilac' icon={<SparkleIcon />} k='more' />
          </div>
        </section>

        <Preview />

        {loading ? (
          <div className='py-10'>
            <LoadingState label='' />
          </div>
        ) : me?.premium ? (
          <ActiveCard me={me} busy={busy} onManage={manage} />
        ) : (
          <section className='flex flex-col gap-4'>
            <h2 className='px-1 text-[22px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('plans.title')}</h2>
            <div role='radiogroup' aria-label={t('plans.title')} className='grid gap-3 sm:grid-cols-3'>
              {PLANS.map((id) => (
                <PlanCard key={id} id={id} selected={plan === id} onSelect={() => setPlan(id)} />
              ))}
            </div>

            <button
              type='button'
              onClick={start}
              disabled={busy}
              className='premium-press group relative mt-2 h-16 w-full overflow-hidden rounded-[22px] bg-[var(--brand)] text-[18px] font-extrabold text-white shadow-[0_10px_30px_-10px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)] disabled:opacity-70'
            >
              <span className='premium-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 blur-md' />
              {busy ? t('cta.loading') : !me?.loggedIn ? t('cta.login') : trial ? t('cta.trial') : t('cta.start')}
            </button>
            {error ? <p className='text-center text-[13px] font-semibold text-[#DC2626]'>{error}</p> : null}
            <Link
              href={href('/premium/redeem')}
              className='self-center text-[14px] font-bold text-[var(--brand)] underline-offset-2 hover:underline'
            >
              {t('redeem.link')}
            </Link>

            <div className='rounded-2xl bg-[#FFF6EE] px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
              <p>
                {trial
                  ? t('disclosure.trial', { date: trialEnd, price: PRICE[plan] })
                  : t('disclosure.noTrial', { price: PRICE[plan] })}
              </p>
              <p className='mt-1'>{t('disclosure.cancel')}</p>
              <p className='mt-1'>
                {rich(t('disclosureRefund'), {
                  policy: (
                    <Link href={href('/premium/policy')} className='font-semibold text-[var(--foreground)] underline underline-offset-2'>
                      {t('policyLink')}
                    </Link>
                  ),
                })}
              </p>
              <p className='mt-1'>
                {rich(t('disclosure.agree'), {
                  terms: (
                    <Link href='/terms' className='font-semibold text-[var(--foreground)] underline underline-offset-2'>
                      {t('disclosure.terms')}
                    </Link>
                  ),
                  privacy: (
                    <Link href='/privacy' className='font-semibold text-[var(--foreground)] underline underline-offset-2'>
                      {t('disclosure.privacy')}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </section>
        )}

        <Faq policyHref={href('/premium/policy')} />
      </div>
    </BoardPageShell>
  )
}

/* ───────────────────────── Sections ───────────────────────── */

function Hero() {
  const t = useT('premium')
  return (
    <section className='relative overflow-hidden rounded-[32px] bg-[linear-gradient(140deg,#FFE3D3_0%,#FFF1E6_45%,#FFF9F2_100%)] px-6 py-9 sm:px-10 sm:py-12'>
      <Dot className='left-[8%] top-[14%] h-3 w-3 bg-[#FFC9AE]' />
      <Dot className='left-[46%] top-[8%] h-2 w-2 bg-[#FFD66B]' />
      <Dot className='bottom-[12%] left-[38%] h-4 w-4 bg-[#FFDCCB]' />
      <Dot className='right-[6%] top-[60%] h-2.5 w-2.5 bg-[#FFB48F]' />
      <div className='relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left'>
        <div className='premium-float shrink-0'>
          <Mascot />
        </div>
        <div className='flex flex-col items-center gap-3 sm:items-start'>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-[var(--brand)] shadow-sm'>
            <ShieldMini /> {t('hero.badge')}
          </span>
          <h1 className='text-[36px] font-black leading-tight tracking-tight text-[var(--foreground)] sm:text-[44px]'>
            {t('hero.title')}
          </h1>
          <p className='text-[20px] font-extrabold text-[var(--brand)]'>{t('hero.promise')}</p>
          <p className='max-w-[460px] text-[15px] leading-relaxed text-[var(--muted-foreground)]'>{t('hero.sub')}</p>
        </div>
      </div>
    </section>
  )
}

const TONES = {
  peach: { bg: 'bg-[#FFF1E8]', blob: 'bg-[#FFD9C4]', ink: 'text-[#E2400F]' },
  mint: { bg: 'bg-[#EAF8F1]', blob: 'bg-[#C8EEDB]', ink: 'text-[#05875F]' },
  sky: { bg: 'bg-[#EBF4FF]', blob: 'bg-[#CFE3FF]', ink: 'text-[#2563EB]' },
  lilac: { bg: 'bg-[#F3EEFF]', blob: 'bg-[#DDD2FF]', ink: 'text-[#7C3AED]' },
} as const

function Benefit({ tone, icon, k }: { tone: keyof typeof TONES; icon: ReactNode; k: 'visa' | 'salary' | 'policy' | 'more' }) {
  const t = useT('premium')
  const c = TONES[tone]
  return (
    <div
      className={`premium-lift flex gap-4 rounded-[26px] ${c.bg} p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.35)] motion-reduce:hover:translate-y-0`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] ${c.blob} ${c.ink}`}>{icon}</div>
      <div className='min-w-0'>
        <p className='text-[17px] font-extrabold tracking-tight text-[var(--foreground)]'>{t(`benefits.${k}.title`)}</p>
        <p className='mt-1 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t(`benefits.${k}.body`)}</p>
        <span className={`mt-2.5 inline-block rounded-full bg-white/80 px-2.5 py-0.5 text-[11.5px] font-bold ${c.ink}`}>
          {t(`benefits.${k}.chip`)}
        </span>
      </div>
    </div>
  )
}

/** A mini, static copy of the app's 신청 현황 tiles and one salary row (labelled as an example). */
function Preview() {
  const t = useT('premium')
  const tile = (label: string, values: number[], color: string, soft: string) => {
    const peak = Math.max(...values, 1)
    return (
      <div className='flex-1 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.3)]'>
        <p className='text-[12px] font-semibold text-[var(--muted-foreground)]'>{label}</p>
        <p className='mt-1 text-[22px] font-black tabular-nums text-[var(--foreground)]'>{values.at(-1)!.toLocaleString()}</p>
        <div className='mt-3 flex h-16 items-end gap-2'>
          {values.map((v, i) => (
            <div key={i} className='flex flex-1 flex-col items-center gap-1'>
              <span className='text-[9.5px] tabular-nums text-[var(--muted)]'>{v.toLocaleString()}</span>
              <div
                className='w-full rounded-md'
                style={{ height: `${Math.max(4, (v / peak) * 44)}px`, background: i === values.length - 1 ? color : soft }}
              />
            </div>
          ))}
        </div>
        <div className='mt-1 flex justify-between px-1 text-[9.5px] text-[var(--muted)]'>
          <span>FY24</span>
          <span>FY25</span>
          <span>FY26</span>
        </div>
      </div>
    )
  }
  return (
    <section className='flex flex-col gap-3'>
      <div className='flex items-baseline justify-between px-1'>
        <h2 className='text-[22px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('preview.title')}</h2>
        <span className='text-[12px] font-semibold text-[var(--muted)]'>{t('preview.example')}</span>
      </div>
      <div className='rounded-[28px] bg-[linear-gradient(160deg,#FFF6EE,#FFFDFB)] p-4 sm:p-5'>
        <div className='flex gap-3'>
          {tile(t('preview.h1b'), [9087, 8945, 9157], '#059669', '#C5E9DA')}
          {tile(t('preview.greenCard'), [1618, 3, 3], '#F64310', '#FFD3C2')}
        </div>
        <div className='mt-3 flex items-center justify-between rounded-[18px] bg-white px-4 py-3 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)]'>
          <div>
            <p className='text-[14px] font-bold text-[var(--foreground)]'>{t('preview.role')}</p>
            <p className='text-[11.5px] text-[var(--muted)]'>{t('preview.base')}</p>
          </div>
          <div className='text-right'>
            <p className='text-[18px] font-black tabular-nums text-[var(--foreground)]'>$186k</p>
            <p className='text-[11.5px] tabular-nums text-[var(--muted)]'>$177k ~ $209k</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PlanCard({ id, selected, onSelect }: { id: PremiumPlanId; selected: boolean; onSelect: () => void }) {
  const t = useT('premium')
  const badge = id === 'monthly' ? null : t(`plans.${id}.badge`)
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      onClick={onSelect}
      className={`premium-press relative flex flex-col items-start gap-1 rounded-[24px] border-2 px-5 pb-5 pt-6 text-left transition duration-200 ${
        selected
          ? 'border-[var(--brand)] bg-white shadow-[0_14px_30px_-16px_rgba(246,67,16,0.55)]'
          : 'border-transparent bg-[#FFF6EE] hover:bg-[#FFEFE4]'
      }`}
    >
      {badge ? (
        <span
          className={`absolute -top-3 left-4 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            id === 'annual' ? 'bg-[var(--brand)] text-white' : 'bg-[#FFE0D2] text-[var(--brand)]'
          }`}
        >
          {badge}
        </span>
      ) : null}
      <span
        aria-hidden
        className={`absolute right-4 top-5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
          selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[#F3C9B6] bg-white'
        }`}
      >
        {selected ? (
          <svg viewBox='0 0 16 16' className='h-3.5 w-3.5' fill='none' stroke='currentColor' strokeWidth='2.6'>
            <path d='M3.5 8.5l3 3 6-7' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        ) : null}
      </span>
      <span className='text-[15px] font-bold text-[var(--foreground)]'>{t(`plans.${id}.name`)}</span>
      <span className='mt-1 flex items-baseline gap-1'>
        <span className='text-[28px] font-black tabular-nums tracking-tight text-[var(--foreground)]'>{t(`plans.${id}.price`)}</span>
        <span className='text-[13px] font-semibold text-[var(--muted)]'>{t(`plans.${id}.per`)}</span>
      </span>
      <span className='flex items-center gap-2 text-[13px]'>
        <span className='font-bold text-[var(--brand)]'>{t(`plans.${id}.monthly`)}</span>
        {id === 'annual' ? <span className='text-[var(--muted)] line-through'>{t('plans.annual.was')}</span> : null}
      </span>
    </button>
  )
}

function ActiveCard({ me, busy, onManage }: { me: PremiumMe; busy: boolean; onManage: () => void }) {
  const t = useT('premium')
  const fmt = useFormat()
  const date = me.until ? fmt.date(me.until, { year: 'numeric', month: 'long', day: 'numeric' }) : null
  const staff = me.source === 'staff'
  const granted = me.source === 'code' || me.source === 'gift'
  const [openedAt] = useState(() => Date.now())
  const daysLeft = me.until ? Math.max(0, Math.ceil((Date.parse(me.until) - openedAt) / 86_400_000)) : null
  return (
    <section className='premium-pop flex flex-col items-center gap-3 rounded-[30px] bg-[linear-gradient(140deg,#FFE3D3,#FFF6EE)] px-6 py-8 text-center'>
      <div className='premium-float'>
        <Mascot small />
      </div>
      <p className='text-[22px] font-black tracking-tight text-[var(--foreground)]'>{t('active.title')}</p>
      <p className='text-[15px] font-bold text-[var(--brand)]'>
        {t('active.plan', { plan: staff ? t('active.staffPlan') : t(`plan.${me.plan ?? 'monthly'}`) })}
      </p>
      {date && granted ? (
        <>
          <p className='text-[14px] text-[var(--muted-foreground)]'>
            {t('active.codeUntil', { date })}
            {daysLeft !== null ? ` · ${t('active.codeDaysLeft', { days: daysLeft })}` : ''}
          </p>
          <p className='max-w-[420px] text-[12.5px] text-[var(--muted)]'>{t('active.code')}</p>
        </>
      ) : date ? (
        <p className='text-[14px] text-[var(--muted-foreground)]'>
          {me.cancelAtPeriodEnd ? t('active.ends', { date }) : t('active.renews', { date })}
        </p>
      ) : null}
      {staff ? <p className='text-[13px] text-[var(--muted)]'>{t('active.staff')}</p> : null}
      {me.source === 'stripe' && me.manageable ? (
        <button
          type='button'
          onClick={onManage}
          disabled={busy}
          className='premium-press mt-2 h-12 rounded-2xl bg-white px-6 text-[15px] font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[#FFF6EE] disabled:opacity-60'
        >
          {t('active.manage')}
        </button>
      ) : null}
      {me.source === 'apple' ? <p className='max-w-[420px] text-[12.5px] text-[var(--muted)]'>{t('active.appStore')}</p> : null}
    </section>
  )
}

function StatusBanner({ status, premium, companiesHref }: { status: 'success' | 'cancel'; premium: boolean; companiesHref: string }) {
  const t = useT('premium')
  if (status === 'cancel') {
    return (
      <div className='rounded-[24px] bg-[#F5F5F4] px-5 py-4 text-center'>
        <p className='text-[16px] font-extrabold text-[var(--foreground)]'>{t('status.cancelTitle')}</p>
        <p className='mt-1 text-[13.5px] text-[var(--muted-foreground)]'>{t('status.cancelBody')}</p>
      </div>
    )
  }
  return (
    <div className='premium-pop relative overflow-hidden rounded-[26px] bg-[linear-gradient(140deg,#DDF5EA,#F2FBF6)] px-5 py-6 text-center'>
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          aria-hidden
          className='premium-confetti absolute h-2 w-2 rounded-full'
          style={{
            left: `${8 + i * 9}%`,
            top: `${10 + ((i * 37) % 60)}%`,
            background: ['#F64310', '#FFD66B', '#059669', '#7C3AED', '#2563EB'][i % 5],
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
      <p className='relative text-[19px] font-black text-[#065F46]'>{t('status.successTitle')}</p>
      <p className='relative mt-1 text-[13.5px] text-[#047857]'>{t('status.successBody')}</p>
      {premium ? (
        <Link
          href={companiesHref}
          className='premium-press relative mt-3 inline-flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-bold text-[#065F46] shadow-sm'
        >
          {t('status.goCompanies')}
        </Link>
      ) : null}
    </div>
  )
}

function Faq({ policyHref }: { policyHref: string }) {
  const t = useT('premium')
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='px-1 text-[22px] font-extrabold tracking-tight text-[var(--foreground)]'>{t('faq.title')}</h2>
      <div className='flex flex-col gap-2.5'>
        {(['cancel', 'app', 'refund', 'code', 'data'] as const).map((k) => (
          <details key={k} className='group rounded-[20px] bg-[#FAFAF9] px-5 py-4 open:bg-[#FFF6EE]'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-[var(--foreground)]'>
              {t(`faq.${k}.q`)}
              <span className='text-[var(--muted)] transition group-open:rotate-45' aria-hidden>
                +
              </span>
            </summary>
            <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t(`faq.${k}.a`)}</p>
          </details>
        ))}
      </div>
      <Link href={policyHref} className='px-1 text-[13px] font-semibold text-[var(--muted-foreground)] underline underline-offset-2'>
        {t('policyLink')}
      </Link>
    </section>
  )
}

/* ───────────────────────── Illustrations ───────────────────────── */

/** A little passport with a face, cheeks and a sparkle. */
function Mascot({ small = false }: { small?: boolean }) {
  const size = small ? 96 : 150
  return (
    <svg width={size} height={size} viewBox='0 0 160 160' aria-hidden>
      <ellipse cx='80' cy='148' rx='42' ry='7' fill='#F6CDB8' opacity='0.6' />
      <rect x='34' y='20' width='92' height='118' rx='22' fill='#F64310' />
      <rect x='34' y='20' width='14' height='118' rx='7' fill='#D93A0C' opacity='0.55' />
      <rect x='52' y='36' width='60' height='54' rx='18' fill='#FFF7F1' />
      <circle cx='70' cy='60' r='5.5' fill='#1F2937' />
      <circle cx='94' cy='60' r='5.5' fill='#1F2937' />
      <circle cx='72' cy='58' r='1.8' fill='#fff' />
      <circle cx='96' cy='58' r='1.8' fill='#fff' />
      <ellipse cx='62' cy='72' rx='6' ry='3.6' fill='#FFB3A1' />
      <ellipse cx='102' cy='72' rx='6' ry='3.6' fill='#FFB3A1' />
      <path d='M74 72 q8 8 16 0' fill='none' stroke='#1F2937' strokeWidth='3.2' strokeLinecap='round' />
      <circle cx='82' cy='112' r='13' fill='none' stroke='#FFE1D4' strokeWidth='3' />
      <path d='M69 112 h26 M82 99 q7 13 0 26 M82 99 q-7 13 0 26' fill='none' stroke='#FFE1D4' strokeWidth='2.4' />
      <path d='M26 74 q-10 6 -6 18' fill='none' stroke='#F64310' strokeWidth='7' strokeLinecap='round' />
      <path d='M134 74 q12 -4 10 -18' fill='none' stroke='#F64310' strokeWidth='7' strokeLinecap='round' />
      <path className='premium-twinkle' d='M138 30 l3.5 8 8 3.5 -8 3.5 -3.5 8 -3.5 -8 -8 -3.5 8 -3.5z' fill='#FFC93C' />
      <path className='premium-twinkle' style={{ animationDelay: '600ms' }} d='M22 40 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z' fill='#FFC93C' />
    </svg>
  )
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`premium-float absolute rounded-full ${className}`} />
}

const icon = (path: ReactNode) => (
  <svg viewBox='0 0 24 24' className='h-7 w-7' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
    {path}
  </svg>
)
const ChartIcon = () => icon(<><path d='M4 20h16' /><rect x='6' y='11' width='3' height='7' rx='1' /><rect x='11' y='7' width='3' height='11' rx='1' /><rect x='16' y='4' width='3' height='14' rx='1' /></>)
const CoinIcon = () => icon(<><circle cx='12' cy='12' r='8.5' /><path d='M14.6 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2.1 2.7.9 2.7 2.2-1.2 2.1-2.7 2.1c-1.2 0-2.3-.6-2.8-1.5M12 6.5v11' /></>)
const ShieldIcon = () => icon(<><path d='M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z' /><path d='M8.8 12.2l2.2 2.2 4.4-4.6' /></>)
const SparkleIcon = () => icon(<><path d='M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z' /><path d='M18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' /></>)
const ShieldMini = () => (
  <svg viewBox='0 0 24 24' className='h-3.5 w-3.5' fill='currentColor' aria-hidden>
    <path d='M12 2l8 3.4v6.2c0 4.9-3.4 8.8-8 10.4-4.6-1.6-8-5.5-8-10.4V5.4z' />
  </svg>
)

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes premium-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
  @keyframes premium-twinkle { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .45; transform: scale(.8) } }
  @keyframes premium-pop { 0% { opacity: 0; transform: scale(.94) } 60% { transform: scale(1.02) } 100% { opacity: 1; transform: scale(1) } }
  @keyframes premium-shine { 0% { transform: translateX(0) } 100% { transform: translateX(450%) } }
  @keyframes premium-confetti { 0% { transform: translateY(-14px) scale(.6); opacity: 0 } 40% { opacity: 1 } 100% { transform: translateY(18px) scale(1); opacity: 0 } }
  .premium-float { animation: premium-float 3.2s ease-in-out infinite }
  .premium-twinkle { transform-box: fill-box; transform-origin: center; animation: premium-twinkle 1.8s ease-in-out infinite }
  .premium-pop { animation: premium-pop .5s cubic-bezier(.2,.9,.3,1.3) both }
  .premium-shine { animation: premium-shine 2.8s ease-in-out infinite }
  .premium-confetti { animation: premium-confetti 1.6s ease-out infinite }
  .premium-press { transition: transform .15s cubic-bezier(.2,.9,.3,1.4) }
  .premium-press:hover { transform: translateY(-2px) }
  .premium-press:active { transform: scale(.97) }
}
`
