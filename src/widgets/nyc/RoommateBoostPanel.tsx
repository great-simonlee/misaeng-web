'use client'

import { useCallback, useEffect, useState } from 'react'

import { BottomSheet } from '@components'
import { useToast } from '@hooks/useToast'
import {
  RoommateBoostError,
  boostRoommatePostRequest,
  fetchRoommateBoostStatus,
  newBoostRequestKey,
  type RoommateBoostStatus,
} from '@lib/community/boost.client'
import { useFormat, useT } from '@lib/i18n/client'
import { cn } from '@lib'
import { PinnedBadge } from '@widgets/nyc/RoommatePostCard'

type LedgerStatus = Extract<RoommateBoostStatus, { engine: 'ledger' }>

/**
 * 내 룸메이트·서블렛 글 "상단에 올리기" (작성자에게만).
 * 포인트 전환 전(engine legacy)이나 꺼져 있으면(disabled) 아예 그리지 않는다.
 */
export function RoommateBoostPanel({
  postId,
  className,
}: {
  postId: string
  className?: string
}) {
  const t = useT('housing')
  const format = useFormat()
  const { success } = useToast()
  const [status, setStatus] = useState<LedgerStatus | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [requestKey, setRequestKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await fetchRoommateBoostStatus(postId)
      setStatus(next && next.engine === 'ledger' ? next : null)
    } catch {
      setStatus(null)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

  if (!status || !status.mine || !status.boostable || status.block === 'disabled') {
    return null
  }

  // 서버 문구(boost.server shortDate)와 같은 뉴욕 기준 날짜
  const shortDate = (iso: string | null | undefined) =>
    iso ? format.date(iso, { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : ''
  const points = (amount: number) =>
    t('roommate.boost.points', { amount: format.number(amount) })
  const cost = points(status.cost)

  function openConfirm() {
    setRequestKey(newBoostRequestKey())
    setSubmitError(null)
    setConfirmOpen(true)
  }

  async function handleBoost() {
    if (submitting || !requestKey) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await boostRoommatePostRequest(postId, requestKey)
      setConfirmOpen(false)
      success(t('roommate.boost.success', { date: shortDate(result.boostedUntil) }))
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof RoommateBoostError && err.message
          ? err.message
          : t('roommate.boost.failed'),
      )
      // 다음 시도는 새 키로, 그 사이 바뀐 상태(자리·포인트)도 다시 읽는다
      setRequestKey(newBoostRequestKey())
      void load()
    } finally {
      setSubmitting(false)
    }
  }

  if (status.active) {
    return (
      <section
        className={cn(
          'rounded-2xl bg-[var(--brand-light)] px-4 py-4 ring-1 ring-[var(--brand)]/15 sm:px-5',
          className,
        )}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <PinnedBadge label={t('roommate.card.pinned')} />
          <p className='text-[14px] font-semibold text-[var(--foreground)]'>
            {t('roommate.boost.activeTitle', { date: shortDate(status.boostedUntil) })}
          </p>
        </div>
        <p className='mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
          {t('roommate.boost.activeBody')}
        </p>
      </section>
    )
  }

  const blockedReason = (() => {
    switch (status.block) {
      case 'cooldown':
        return t('roommate.boost.blocked.cooldown', { date: shortDate(status.availableAt) })
      case 'monthly_cap':
        return t('roommate.boost.blocked.monthlyCap', { max: status.monthlyCap ?? 0 })
      case 'slots_full':
        return status.availableAt
          ? t('roommate.boost.blocked.slotsFull', {
              total: status.slotsTotal ?? status.slotsUsed,
              date: shortDate(status.availableAt),
            })
          : t('roommate.boost.blocked.slotsFullNoDate', {
              total: status.slotsTotal ?? status.slotsUsed,
            })
      case 'insufficient':
        return t('roommate.boost.blocked.insufficient', {
          available: points(status.available ?? 0),
          cost,
        })
      default:
        return null
    }
  })()
  const canBoost = status.block === null

  const endsAt = new Date(Date.now() + status.days * 86_400_000).toISOString()
  const confirmRows: { label: string; value: string; emphasize?: boolean }[] = [
    { label: t('roommate.boost.confirmCost'), value: cost, emphasize: true },
    {
      label: t('roommate.boost.confirmPeriod'),
      value: t('roommate.boost.confirmPeriodValue', { days: status.days, date: shortDate(endsAt) }),
    },
    ...(status.available != null
      ? [
          {
            label: t('roommate.boost.confirmBalance'),
            value: points(Math.max(0, status.available - status.cost)),
          },
        ]
      : []),
    ...(status.monthlyCap
      ? [
          {
            label: t('roommate.boost.confirmMonthly'),
            value: t('roommate.boost.confirmMonthlyValue', {
              used: status.monthlyUsed + 1,
              max: status.monthlyCap,
            }),
          },
        ]
      : []),
    ...(status.slotsTotal
      ? [
          {
            label: t('roommate.boost.confirmSlots'),
            value: t('roommate.boost.confirmSlotsValue', {
              used: status.slotsUsed,
              total: status.slotsTotal,
            }),
          },
        ]
      : []),
  ]

  return (
    <section
      className={cn(
        'rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.06] sm:px-5',
        className,
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h2 className='text-[14px] font-semibold text-[var(--foreground)]'>
            {t('roommate.boost.title')}
            <span className='ml-2 text-[12px] font-medium tabular-nums text-[var(--muted)]'>
              {t('roommate.boost.meta', { cost, days: status.days })}
            </span>
          </h2>
          <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('roommate.boost.description', { days: status.days })}
          </p>
        </div>
        <button
          type='button'
          onClick={openConfirm}
          disabled={!canBoost}
          className='inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:bg-black/[0.08] disabled:text-[var(--muted)]'
        >
          {t('roommate.boost.cta')}
        </button>
      </div>
      {blockedReason ? (
        <p className='mt-3 rounded-xl bg-[#f7f8fa] px-3 py-2.5 text-[12px] font-medium leading-relaxed text-[var(--muted-foreground)]'>
          {blockedReason}
        </p>
      ) : null}

      <BottomSheet
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false)
        }}
        title={t('roommate.boost.confirmTitle')}
        footer={
          <div className='flex items-center gap-2 px-5 py-4'>
            <button
              type='button'
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.08] touch-manipulation transition hover:ring-black/15 disabled:opacity-50'
            >
              {t('roommate.boost.cancel')}
            </button>
            <button
              type='button'
              onClick={() => void handleBoost()}
              disabled={submitting}
              className='inline-flex h-11 flex-[1.6] items-center justify-center rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)] disabled:opacity-60'
            >
              {submitting
                ? t('roommate.boost.submitting')
                : t('roommate.boost.confirmSubmit', { cost })}
            </button>
          </div>
        }
      >
        <div className='px-3 pb-2'>
          <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('roommate.boost.description', { days: status.days })}
          </p>
          <dl className='mt-4 divide-y divide-black/[0.05] rounded-2xl bg-[#f7f8fa] px-4'>
            {confirmRows.map((row) => (
              <div key={row.label} className='flex items-center justify-between gap-3 py-3'>
                <dt className='text-[13px] text-[var(--muted-foreground)]'>{row.label}</dt>
                <dd
                  className={cn(
                    'text-right text-[14px] font-semibold tabular-nums',
                    row.emphasize ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className='mt-3 text-[12px] leading-relaxed text-[var(--muted)]'>
            {t('roommate.boost.confirmNote', { days: status.cooldownDays })}
          </p>
          {submitError ? (
            <p
              role='alert'
              className='mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-red-700'
            >
              {submitError}
            </p>
          ) : null}
        </div>
      </BottomSheet>
    </section>
  )
}
