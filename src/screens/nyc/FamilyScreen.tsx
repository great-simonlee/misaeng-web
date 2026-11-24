'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { BottomSheet, LoadingState, UserAvatar } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { byBrand } from '@lib/brand/design'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import {
  acceptFamilyRequest,
  cancelFamilyRequest,
  declineFamilyRequest,
  fetchFamily,
  openFamilyPortal,
  sendFamilyRequest,
  setDigestOptOut,
  startChildCheckout,
  unlinkFamily,
  type FamilyChild,
  type FamilyOverview,
} from '@lib/family/client'
import { useFormat, useLocale, useT } from '@lib/i18n/client'
import { rich } from '@lib/i18n/rich'
import type { PremiumPlanId } from '@lib/premium/client'

/**
 * My → 자녀 / 부모님 (1.0.9, owner decisions 2026-11-24).
 * Parent: linked children with their Premium status, "프리미엄 결제하기" (Stripe checkout on the parent's customer,
 * forUid), "구독 관리" (portal), "연결 끊기" (the child keeps the paid period, auto-renew stops), "자녀 연결하기" by
 * email + pending requests, the parent's own 14-day pass and the digest switch.
 * Child: link requests to accept / decline, linked parents with "연결 끊기". Never the child's activity.
 */

const PLANS: PremiumPlanId[] = ['annual', 'season', 'monthly']
const card =
  'overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'
const primaryButton =
  'flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-50'
const quietButton =
  'flex min-h-10 items-center justify-center rounded-full bg-[#f4f5f7] px-4 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#eceef1] disabled:opacity-50'

type Unlinking = { uid: string; name: string | null; role: 'parent' | 'child'; apple: boolean }

export function FamilyScreen() {
  const t = useT('me.family')
  const router = useRouter()
  const city = useCity()
  const href = useCityPath()
  const locale = useLocale()
  const toast = useToast()
  const { user, loading } = useAuth()
  const [data, setData] = useState<FamilyOverview | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [buyFor, setBuyFor] = useState<FamilyChild | null>(null)
  const [unlinking, setUnlinking] = useState<Unlinking | null>(null)
  const [status, setStatus] = useState<'success' | 'cancel' | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace(cityLoginPath(city, href('/me/family')))
  }, [user, loading, router, city, href])

  const load = useCallback(async () => {
    try {
      setData(await fetchFamily())
      setFailed(null)
    } catch (error) {
      setFailed(getErrorMessage(error, t('loadFailed')))
    }
  }, [t])

  useEffect(() => {
    if (!user) return
    const value = new URLSearchParams(window.location.search).get('status')
    const checkout = value === 'success' || value === 'cancel' ? value : null
    setStatus(checkout)
    let alive = true
    void (async () => {
      await load()
      // The webhook can land a few seconds after Stripe sends the parent back
      for (let i = 0; checkout === 'success' && alive && i < 6; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500))
        if (alive) await load()
      }
    })()
    return () => {
      alive = false
    }
  }, [user, load])

  async function run(key: string, action: () => Promise<unknown>, done?: string) {
    setBusy(key)
    try {
      await action()
      if (done) toast.success(done)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, t('actionFailed')))
    } finally {
      setBusy(null)
    }
  }

  if (loading || !user || (!data && !failed)) return <LoadingState fullPage />

  return (
    <div className={byBrand('relative flex flex-1 flex-col bg-white', 'relative flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]')}>
      <div className={cn('mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 pb-14 sm:pb-16', byBrand('pt-4 sm:pt-5 lg:pt-6', 'pt-8 sm:pt-10'), NYC_PAGE_SHELL_CLASS)}>
        <header>
          <Link href={href('/me')} className='text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]'>
            ← {t('back')}
          </Link>
          <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] lg:text-[1.75rem]'>
            {data?.role === 'parent' ? t('titleParent') : t('titleMember')}
          </h1>
          <p className='mt-1.5 text-[14px] text-[var(--muted-foreground)]'>
            {data?.role === 'parent' ? t('introParent') : t('introMember')}
          </p>
        </header>

        {failed ? (
          <div className={cn(card, 'flex flex-col items-center gap-3 px-5 py-8 text-center')}>
            <p className='text-[14px] text-[var(--muted-foreground)]'>{failed}</p>
            <button type='button' className={quietButton} onClick={() => void load()}>
              {t('retry')}
            </button>
          </div>
        ) : null}

        {status ? (
          <div className={cn('rounded-[1.25rem] px-5 py-4', status === 'success' ? 'bg-[#EAF8F1]' : 'bg-[#f4f5f7]')}>
            <p className='text-[15px] font-semibold text-[var(--foreground)]'>{t(`checkout.${status}Title`)}</p>
            <p className='mt-1 text-[13px] text-[var(--muted-foreground)]'>{t(`checkout.${status}Body`)}</p>
          </div>
        ) : null}

        {data?.role === 'parent' ? (
          <ParentView
            data={data}
            busy={busy}
            onBuy={setBuyFor}
            onManage={() =>
              void run('portal', async () => {
                const { url } = await openFamilyPortal(city, locale)
                window.location.assign(url)
              })
            }
            onUnlink={(child) =>
              setUnlinking({ uid: child.uid, name: child.nickname, role: 'parent', apple: child.premium.paidByMe && child.premium.channel === 'apple' })
            }
            onRequest={(email) => run('request', () => sendFamilyRequest(email), t('add.sent'))}
            onCancelRequest={(id) => void run(`cancel:${id}`, () => cancelFamilyRequest(id), t('pending.canceled'))}
            onDigest={(optedOut) => void run('digest', () => setDigestOptOut(optedOut))}
          />
        ) : data ? (
          <MemberView
            data={data}
            busy={busy}
            onAccept={(id) => void run(`accept:${id}`, () => acceptFamilyRequest(id), t('incoming.accepted'))}
            onDecline={(id) => void run(`decline:${id}`, () => declineFamilyRequest(id), t('incoming.declined'))}
            onUnlink={(parent) => setUnlinking({ uid: parent.uid, name: parent.nickname, role: 'child', apple: false })}
          />
        ) : null}
      </div>

      <BuySheet child={buyFor} onClose={() => setBuyFor(null)} />

      <BottomSheet
        open={Boolean(unlinking)}
        onClose={() => setUnlinking(null)}
        title={t('unlink.title', { name: unlinking?.name || t(unlinking?.role === 'parent' ? 'childFallback' : 'parentFallback') })}
        footer={
          <div className='flex gap-2'>
            <button type='button' className={cn(quietButton, 'flex-1')} onClick={() => setUnlinking(null)}>
              {t('unlink.keep')}
            </button>
            <button
              type='button'
              disabled={busy === 'unlink'}
              className='flex min-h-10 flex-1 items-center justify-center rounded-full bg-[#DC2626] px-4 text-[13px] font-semibold text-white disabled:opacity-50'
              onClick={() => {
                const target = unlinking
                if (!target) return
                void run('unlink', async () => {
                  const result = await unlinkFamily(target.uid)
                  setUnlinking(null)
                  if (result.renewalStopped === 'apple_manual') toast.success(t('unlink.appleToast'))
                }, t('unlink.done'))
              }}
            >
              {busy === 'unlink' ? t('working') : t('unlink.confirm')}
            </button>
          </div>
        }
      >
        <div className='space-y-2 px-1 pb-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          <p>{unlinking?.role === 'parent' ? t('unlink.parentBody') : t('unlink.childBody')}</p>
          {unlinking?.apple ? <p className='rounded-xl bg-[#FFF6EE] px-3.5 py-3 text-[13px] text-[var(--foreground)]'>{t('unlink.apple')}</p> : null}
        </div>
      </BottomSheet>
    </div>
  )
}

/* ───────────────────────── Parent ───────────────────────── */

function ParentView({
  data,
  busy,
  onBuy,
  onManage,
  onUnlink,
  onRequest,
  onCancelRequest,
  onDigest,
}: {
  data: FamilyOverview
  busy: string | null
  onBuy: (child: FamilyChild) => void
  onManage: () => void
  onUnlink: (child: FamilyChild) => void
  onRequest: (email: string) => Promise<void>
  onCancelRequest: (id: string) => void
  onDigest: (optedOut: boolean) => void
}) {
  const t = useT('me.family')
  const fmt = useFormat()
  const [email, setEmail] = useState('')
  const [openedAt] = useState(() => Date.now())
  const passUntil = data.parentPremium.until
  const passDays = passUntil ? Math.max(0, Math.ceil((Date.parse(passUntil) - openedAt) / 86_400_000)) : 0

  return (
    <>
      {passUntil && passDays > 0 ? (
        <div className='rounded-[1.25rem] bg-[linear-gradient(140deg,#FFE3D3,#FFF6EE)] px-5 py-4'>
          <p className='text-[15px] font-semibold text-[var(--foreground)]'>{t('pass.title')}</p>
          <p className='mt-1 text-[13px] text-[var(--muted-foreground)]'>
            {t('pass.body', { days: passDays, date: fmt.date(passUntil, { month: 'long', day: 'numeric' }) })}
          </p>
        </div>
      ) : null}

      <section>
        <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('children.title')}</h3>
        {data.children.length === 0 ? (
          <div className={cn(card, 'px-5 py-5 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]')}>{t('children.empty')}</div>
        ) : (
          <ul className={cn(card, 'divide-y divide-[#f0f1f3]')}>
            {data.children.map((child) => (
              <li key={child.uid} className='px-5 py-4'>
                <div className='flex items-center gap-3'>
                  <UserAvatar photoURL={child.avatarUrl} name={child.nickname ?? ''} size='md' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[15px] font-semibold text-[var(--foreground)]'>{child.nickname || t('childFallback')}</p>
                    <p className='mt-0.5 text-[12.5px] text-[var(--muted-foreground)]'>
                      <ChildStatus child={child} />
                    </p>
                  </div>
                </div>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {child.canBuy ? (
                    <button type='button' className={primaryButton} onClick={() => onBuy(child)}>
                      {t('children.buy')}
                    </button>
                  ) : null}
                  {child.premium.paidByMe && child.premium.channel === 'stripe' ? (
                    <button type='button' className={quietButton} disabled={busy === 'portal'} onClick={onManage}>
                      {t('children.manage')}
                    </button>
                  ) : null}
                  <button type='button' className={quietButton} onClick={() => onUnlink(child)}>
                    {t('children.unlink')}
                  </button>
                </div>
                {child.premium.paidByMe && child.premium.channel !== 'stripe' && child.premium.channel ? (
                  <p className='mt-2 text-[12px] text-[var(--muted)]'>{t(`children.manageIn.${child.premium.channel}`)}</p>
                ) : null}
                {!child.canBuy && child.buyBlockedReason && child.buyBlockedReason !== 'ALREADY_PAID_BY_YOU' ? (
                  <p className='mt-2 text-[12px] text-[var(--muted)]'>{t(`blocked.${child.buyBlockedReason}`)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('add.title')}</h3>
        <div className={cn(card, 'px-5 py-4')}>
          <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{t('add.body')}</p>
          <form
            className='mt-3 flex flex-col gap-2 sm:flex-row'
            onSubmit={(event) => {
              event.preventDefault()
              if (!email.trim()) return
              void onRequest(email.trim()).then(() => setEmail(''))
            }}
          >
            <input
              type='email'
              inputMode='email'
              autoComplete='off'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('add.placeholder')}
              className='h-11 min-w-0 flex-1 rounded-xl bg-[#f4f5f7] px-3.5 text-sm text-[var(--foreground)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30'
            />
            <button type='submit' className={primaryButton} disabled={busy === 'request' || !email.trim()}>
              {busy === 'request' ? t('working') : t('add.send')}
            </button>
          </form>
          {data.outgoing.length ? (
            <ul className='mt-4 divide-y divide-[#f0f1f3] border-t border-[#f0f1f3]'>
              {data.outgoing.map((request) => (
                <li key={request.id} className='flex items-center gap-3 py-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[14px] font-medium text-[var(--foreground)]'>{request.email}</p>
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                      {t('pending.waiting', { date: fmt.date(request.expiresAt, { month: 'long', day: 'numeric' }) })}
                    </p>
                  </div>
                  <button
                    type='button'
                    className={quietButton}
                    disabled={busy === `cancel:${request.id}`}
                    onClick={() => onCancelRequest(request.id)}
                  >
                    {t('pending.cancel')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('digest.title')}</h3>
        <label className={cn(card, 'flex cursor-pointer items-center gap-3 px-5 py-4')}>
          <span className='min-w-0 flex-1'>
            <span className='block text-[14px] font-medium text-[var(--foreground)]'>{t('digest.label')}</span>
            <span className='mt-0.5 block text-[12px] leading-relaxed text-[var(--muted)]'>{t('digest.hint')}</span>
          </span>
          <input
            type='checkbox'
            className='size-5 accent-[var(--brand)]'
            checked={!data.digest.optedOut}
            disabled={busy === 'digest'}
            onChange={(event) => onDigest(!event.target.checked)}
          />
        </label>
      </section>
    </>
  )
}

function ChildStatus({ child }: { child: FamilyChild }) {
  const t = useT('me.family')
  const fmt = useFormat()
  const p = child.premium
  const date = p.until ? fmt.date(p.until, { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const plan = p.plan && ['monthly', 'season', 'annual'].includes(p.plan) ? t(`plan.${p.plan}`) : ''
  if (!p.premium) return <>{t('status.none')}</>
  if (p.paidByMe) {
    if (p.status === 'past_due') return <>{t('status.pastDue')}</>
    return <>{p.cancelAtPeriodEnd ? t('status.mineEnds', { plan, date }) : p.status === 'trialing' ? t('status.mineTrial', { plan, date }) : t('status.mine', { plan, date })}</>
  }
  if (p.paidByOtherParent) return <>{t('status.otherParent', { date })}</>
  if (p.ownPaid) return <>{t('status.own')}</>
  return <>{t('status.free', { date })}</>
}

/** Plan picker for one child → Stripe checkout (forUid) on the parent's customer. */
export function BuySheet({ child, onClose }: { child: FamilyChild | null; onClose: () => void }) {
  const t = useT('me.family')
  const tp = useT('premium')
  const city = useCity()
  const href = useCityPath()
  const locale = useLocale()
  const [plan, setPlan] = useState<PremiumPlanId>('annual')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pay() {
    if (!child) return
    setBusy(true)
    setError('')
    try {
      const { url } = await startChildCheckout(plan, child.uid, city, locale)
      window.location.assign(url)
    } catch (e) {
      setBusy(false)
      setError(getErrorMessage(e, t('actionFailed')))
    }
  }

  return (
    <BottomSheet
      open={Boolean(child)}
      onClose={onClose}
      title={t('buy.title', { name: child?.nickname || t('childFallback') })}
      footer={
        <button type='button' className={cn(primaryButton, 'w-full')} disabled={busy} onClick={() => void pay()}>
          {busy ? t('working') : t('buy.pay', { price: tp(`plans.${plan}.price`) })}
        </button>
      }
    >
      <div className='space-y-3 px-1 pb-2'>
        <div role='radiogroup' className='grid gap-2'>
          {PLANS.map((id) => (
            <button
              key={id}
              type='button'
              role='radio'
              aria-checked={plan === id}
              onClick={() => setPlan(id)}
              className={cn(
                'flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition',
                plan === id ? 'border-[var(--brand)] bg-white' : 'border-transparent bg-[#FFF6EE]',
              )}
            >
              <span className='text-[14px] font-semibold text-[var(--foreground)]'>{tp(`plans.${id}.name`)}</span>
              <span className='text-[14px] font-bold tabular-nums text-[var(--foreground)]'>
                {tp(`plans.${id}.price`)} <span className='text-[12px] font-medium text-[var(--muted)]'>{tp(`plans.${id}.per`)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className='space-y-1.5 rounded-2xl bg-[#FFF6EE] px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
          <p>{t('buy.payer')}</p>
          <p>{t('buy.renew')}</p>
          <p>{t('buy.pass')}</p>
          <p>{t('buy.digest')}</p>
          <p>
            {rich(t('buy.refund'), {
              policy: (
                <Link href={href('/premium/policy')} className='font-semibold text-[var(--foreground)] underline underline-offset-2'>
                  {tp('policyLink')}
                </Link>
              ),
            })}
          </p>
        </div>
        {error ? <p className='text-center text-[13px] font-semibold text-[#DC2626]'>{error}</p> : null}
      </div>
    </BottomSheet>
  )
}

/* ───────────────────────── Child / member ───────────────────────── */

function MemberView({
  data,
  busy,
  onAccept,
  onDecline,
  onUnlink,
}: {
  data: FamilyOverview
  busy: string | null
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onUnlink: (parent: FamilyOverview['parents'][number]) => void
}) {
  const t = useT('me.family')
  const fmt = useFormat()
  return (
    <>
      {data.incoming.length ? (
        <section>
          <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('incoming.title')}</h3>
          <ul className={cn(card, 'divide-y divide-[#f0f1f3]')}>
            {data.incoming.map((request) => (
              <li key={request.id} className='px-5 py-4'>
                <p className='text-[14.5px] font-semibold text-[var(--foreground)]'>
                  {t('incoming.line', { name: request.parentNickname || t('parentFallback') })}
                </p>
                <p className='mt-1 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('incoming.privacy')}</p>
                <p className='mt-1 text-[12px] text-[var(--muted)]'>
                  {t('incoming.until', { date: fmt.date(request.expiresAt, { month: 'long', day: 'numeric' }) })}
                </p>
                <div className='mt-3 flex gap-2'>
                  <button type='button' className={primaryButton} disabled={Boolean(busy)} onClick={() => onAccept(request.id)}>
                    {t('incoming.accept')}
                  </button>
                  <button type='button' className={quietButton} disabled={Boolean(busy)} onClick={() => onDecline(request.id)}>
                    {t('incoming.decline')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>{t('parents.title')}</h3>
        {data.parents.length === 0 ? (
          <div className={cn(card, 'px-5 py-5 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]')}>{t('parents.empty')}</div>
        ) : (
          <ul className={cn(card, 'divide-y divide-[#f0f1f3]')}>
            {data.parents.map((parent) => (
              <li key={parent.uid} className='flex items-center gap-3 px-5 py-4'>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-[15px] font-semibold text-[var(--foreground)]'>{parent.nickname || t('parentFallback')}</p>
                  <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                    {t('parents.since', { date: fmt.date(parent.linkedAt, { year: 'numeric', month: 'long', day: 'numeric' }) })}
                    {parent.paying ? ` · ${t('parents.paying')}` : ''}
                  </p>
                </div>
                <button type='button' className={quietButton} onClick={() => onUnlink(parent)}>
                  {t('children.unlink')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className='mt-2 px-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>{t('parents.sees')}</p>
      </section>
    </>
  )
}
