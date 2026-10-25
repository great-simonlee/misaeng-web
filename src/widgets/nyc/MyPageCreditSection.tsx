'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { BottomSheet } from '@components'
import { useCityPath } from '@hooks/useCity'
import { useToast } from '@hooks/useToast'
import {
  COMMUNITY_CREDIT_REDEEM_OPTIONS,
  communityCreditEntryLabel,
  type CommunityCreditEntry,
} from '@lib/constants/communityCredit'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'

type CreditSummary = {
  balance: number
  entryCount: number
  integrityOk: boolean
  updatedAt: number
}

type CreditLedger = CreditSummary & {
  entries: CommunityCreditEntry[]
}

const ABSOLUTE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}

const KNOWN_KINDS: readonly CommunityCreditEntry['kind'][] = [
  'earn',
  'revoke',
  'spend',
  'restore',
]

function shortRef(id: string) {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '')
  return clean.slice(-8).toUpperCase() || id.slice(-8).toUpperCase()
}

/** `me.credit.kinds.<kind>` 키 (모르는 종류는 other) */
function kindKey(kind: CommunityCreditEntry['kind']) {
  return KNOWN_KINDS.includes(kind) ? kind : 'other'
}

type Props = {
  className?: string
}

const creditPillButtonClassName =
  'group relative inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_55%,#7c2d12_140%)] px-3.5 shadow-[0_6px_16px_rgba(15,23,42,0.14)] touch-manipulation transition duration-200 hover:brightness-110 active:scale-[0.98]'

function CreditPillGlow() {
  return (
    <span
      className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgb(var(--brand-rgb)/0.35),transparent_55%)]'
      aria-hidden
    />
  )
}

/** 프로필 카드용 간단 크레딧 잔액 + 내역 모달 */
export function MyPageCreditSection({ className }: Props) {
  const t = useT('me')
  const tCredit = useT('credit')
  const format = useFormat()
  const href = useCityPath()
  const { success } = useToast()
  const [summary, setSummary] = useState<CreditSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedRedeemId, setSelectedRedeemId] = useState<string | null>(null)
  const [ledger, setLedger] = useState<CreditLedger | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/community/credit', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => null)) as
        | (CreditSummary & { error?: string })
        | null

      if (!res.ok) {
        throw new Error(data?.error || t('credit.loadFailed'))
      }

      setSummary({
        balance: Number(data?.balance) || 0,
        entryCount: Number(data?.entryCount) || 0,
        integrityOk: data?.integrityOk !== false,
        updatedAt: Number(data?.updatedAt) || Date.now(),
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('credit.loadFailed'),
      )
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true)
    setLedgerError(null)
    try {
      const res = await fetch('/api/community/credit?ledger=1&limit=50', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const data = (await res.json().catch(() => null)) as
        | (CreditLedger & { error?: string })
        | null

      if (!res.ok) {
        throw new Error(data?.error || t('credit.ledgerLoadFailed'))
      }

      const next: CreditLedger = {
        balance: Number(data?.balance) || 0,
        entryCount: Number(data?.entryCount) || 0,
        integrityOk: data?.integrityOk !== false,
        updatedAt: Number(data?.updatedAt) || Date.now(),
        entries: Array.isArray(data?.entries) ? data.entries : [],
      }
      setLedger(next)
      setSummary({
        balance: next.balance,
        entryCount: next.entryCount,
        integrityOk: next.integrityOk,
        updatedAt: next.updatedAt,
      })
    } catch (err) {
      setLedgerError(
        err instanceof Error ? err.message : t('credit.ledgerLoadFailed'),
      )
      setLedger(null)
    } finally {
      setLedgerLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  function openHistory() {
    setHistoryOpen(true)
    void loadLedger()
  }

  function openRequest() {
    setSelectedRedeemId(null)
    setRequestOpen(true)
  }

  function handleRedeemSubmit() {
    if (!selectedRedeemId) return
    setRequestOpen(false)
    success(t('credit.redeemComingSoon'))
  }

  const redeemOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter(
    (option) => !option.comingSoon,
  )
  const balance = summary?.balance ?? 0

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
      {loading ? (
        <div
          className='h-9 w-[9.5rem] animate-pulse rounded-full bg-[#f0f1f3]'
          aria-busy
        />
      ) : error ? (
        <button
          type='button'
          onClick={() => void loadSummary()}
          className='inline-flex h-9 items-center rounded-full bg-[#f7f8fa] px-3.5 text-[12px] font-medium text-[var(--muted)] ring-1 ring-black/[0.05] touch-manipulation'
        >
          {t('credit.loadFailedRetry')}
        </button>
      ) : summary ? (
        <button
          type='button'
          onClick={openHistory}
          className={cn(creditPillButtonClassName, 'gap-2 text-left')}
          aria-label={t('credit.pillAria', { count: summary.balance })}
        >
          <CreditPillGlow />
          <span className='relative flex size-5 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15'>
            <CreditMarkIcon className='size-3 text-[#ffb199]' />
          </span>
          <span className='relative flex items-baseline gap-1'>
            <span className='text-[14px] font-bold tabular-nums tracking-tight text-white'>
              {format.number(summary.balance)}
            </span>
            <span className='text-[11px] font-medium text-white/70'>
              {t('credit.unit')}
            </span>
          </span>
          <span className='relative h-3 w-px bg-white/20' aria-hidden />
          <span className='relative text-[11px] font-semibold text-white/85'>
            {t('credit.history')}
            {summary.entryCount > 0 ? (
              <span className='ml-1 tabular-nums text-white/55'>
                {summary.entryCount}
              </span>
            ) : null}
          </span>
        </button>
      ) : null}

      {!loading && !error && summary ? (
        <button
          type='button'
          onClick={openRequest}
          className={creditPillButtonClassName}
          aria-label={t('credit.requestTitle')}
        >
          <CreditPillGlow />
          <span className='relative text-[11px] font-semibold text-white/85'>
            {t('credit.requestTitle')}
          </span>
        </button>
      ) : null}

      <BottomSheet
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title={t('credit.requestTitle')}
        maxHeightClassName='max-h-[min(82dvh,680px)]'
      >
        <div className='space-y-4 px-3 pb-2 pt-1'>
          <div className='rounded-2xl bg-[#f7f8fa] px-4 py-3'>
            <p className='text-[11px] text-[var(--muted)]'>{t('credit.balanceLabel')}</p>
            <p className='mt-0.5 text-[1.25rem] font-bold tabular-nums text-[var(--foreground)]'>
              {format.number(balance)}
            </p>
          </div>

          <p className='px-0.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('credit.requestDescription')}
          </p>

          <ul className='space-y-2'>
            {redeemOptions.map((option) => {
              const affordable = balance >= option.cost
              const selected = selectedRedeemId === option.id

              return (
                <li key={option.id}>
                  <button
                    type='button'
                    onClick={() => setSelectedRedeemId(option.id)}
                    className={cn(
                      'w-full rounded-2xl px-4 py-3.5 text-left ring-1 transition touch-manipulation',
                      selected
                        ? 'bg-brand-soft ring-[var(--brand)]'
                        : 'bg-white ring-black/[0.05] hover:ring-black/[0.1]',
                    )}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                          {tCredit(`redeemOptions.${option.id}.label`)}
                        </p>
                        <p className='mt-1 text-[12px] text-[var(--muted)]'>
                          {t('credit.optionMeta', {
                            duration: tCredit(`redeemOptions.${option.id}.duration`),
                            count: option.monthlyCap,
                          })}
                        </p>
                      </div>
                      <span className='shrink-0 text-[15px] font-bold tabular-nums text-[var(--brand)]'>
                        {option.cost}
                      </span>
                    </div>
                    {!affordable ? (
                      <p className='mt-2 text-[12px] text-[var(--muted)]'>
                        {t('credit.needMore', { count: option.cost - balance })}
                      </p>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          <Link
            href={`${href('/credit')}#redeem`}
            onClick={() => setRequestOpen(false)}
            className='block px-0.5 text-[12px] font-medium text-[var(--brand)] hover:underline'
          >
            {t('credit.redeemGuideLink')}
          </Link>

          <button
            type='button'
            disabled={
              !selectedRedeemId ||
              !redeemOptions.some(
                (option) =>
                  option.id === selectedRedeemId && balance >= option.cost,
              )
            }
            onClick={handleRedeemSubmit}
            className='flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-45'
          >
            {t('credit.submit')}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('credit.historyTitle')}
        maxHeightClassName='max-h-[min(82dvh,680px)]'
      >
        <div className='space-y-4 px-3 pb-2 pt-1'>
          <div className='flex items-center justify-between gap-3 rounded-2xl bg-[#f7f8fa] px-4 py-3'>
            <div>
              <p className='text-[11px] text-[var(--muted)]'>{t('credit.balanceLabel')}</p>
              <p className='mt-0.5 text-[1.25rem] font-bold tabular-nums text-[var(--foreground)]'>
                {format.number(ledger?.balance ?? summary?.balance ?? 0)}
              </p>
            </div>
            <Link
              href={href('/credit')}
              onClick={() => setHistoryOpen(false)}
              className='text-[12px] font-medium text-[var(--brand)] hover:underline'
            >
              {t('credit.guideLink')}
            </Link>
          </div>

          {ledgerLoading ? (
            <div className='space-y-2' aria-busy>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className='h-14 animate-pulse rounded-2xl bg-[#f0f1f3]'
                />
              ))}
            </div>
          ) : ledgerError ? (
            <div className='px-1 py-4'>
              <p className='text-[13px] text-[var(--muted-foreground)]'>
                {ledgerError}
              </p>
              <button
                type='button'
                onClick={() => void loadLedger()}
                className='mt-2 text-[13px] font-semibold text-[var(--brand)]'
              >
                {t('credit.retry')}
              </button>
            </div>
          ) : !ledger || ledger.entries.length === 0 ? (
            <div className='px-1 py-6 text-center'>
              <p className='text-[14px] font-semibold text-[var(--foreground)]'>
                {t('credit.emptyTitle')}
              </p>
              <p className='mt-1 text-[13px] text-[var(--muted)]'>
                {t('credit.emptyDescription')}
              </p>
              <Link
                href={href('/food/new')}
                onClick={() => setHistoryOpen(false)}
                className='mt-4 inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white'
              >
                {t('credit.writeFoodReview')}
              </Link>
            </div>
          ) : (
            <ul className='space-y-2'>
              {ledger.entries.map((entry) => (
                <li
                  key={entry.id}
                  className='rounded-2xl bg-white px-4 py-3 ring-1 ring-black/[0.05]'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                            entry.kind === 'earn' || entry.kind === 'restore'
                              ? 'bg-brand-subtle text-[var(--brand)]'
                              : 'bg-[#f3f4f6] text-[var(--muted)]',
                          )}
                        >
                          {t(`credit.kinds.${kindKey(entry.kind)}`)}
                        </span>
                        <p className='truncate text-[13px] font-semibold text-[var(--foreground)]'>
                          {communityCreditEntryLabel(entry, tCredit)}
                        </p>
                      </div>
                      <p className='mt-1 text-[11px] tabular-nums text-[var(--muted)]'>
                        {format.date(entry.createdAt, ABSOLUTE_TIME_OPTIONS)}
                      </p>
                      <p className='mt-0.5 font-mono text-[10px] text-[var(--muted)]'>
                        REF {shortRef(entry.id)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[15px] font-bold tabular-nums',
                        entry.amount >= 0
                          ? 'text-[var(--brand)]'
                          : 'text-[var(--muted-foreground)]',
                      )}
                    >
                      {entry.amount >= 0 ? '+' : ''}
                      {format.number(entry.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}

function CreditMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 16 16' fill='none' aria-hidden className={className}>
      <circle cx='8' cy='8' r='5.25' stroke='currentColor' strokeWidth='1.4' />
      <path
        d='M8 4.75v6.5M6.2 6.4c.35-.55 1-.9 1.8-.9 1.15 0 2 .7 2 1.7 0 .95-.7 1.55-2 1.9-1.2.3-1.9.85-1.9 1.75 0 .95.85 1.65 2.05 1.65.85 0 1.55-.35 1.9-.95'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
