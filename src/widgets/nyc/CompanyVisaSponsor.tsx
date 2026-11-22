'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { BottomSheet } from '@components'
import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import type { VisaSponsorData, VisaSponsorRole, VisaSponsorYear } from '@lib/company/client'
import { useT } from '@lib/i18n/client'

/**
 * Visa & sponsorship (Premium) — same design as the apps (misaeng-app VisaSponsor.swift):
 * the company page shows one summary row (lock for free members → Premium sheet), the full view lives on
 * /companies/{slug}/visa. Figures: U.S. Department of Labor OFLC public data (H-1B = LCA, green card = PERM).
 */

const CARD = 'rounded-[1.25rem] bg-white ring-1 ring-black/[0.06]'
const ROLE_PREVIEW = 10
const REGIONS = ['NY', 'MA', 'ALL'] as const

export function SponsorSectionTitle({ title, premium = false }: { title: string; premium?: boolean }) {
  const t = useT('companies')
  return (
    <h2 className='flex items-center gap-2 text-[17px] font-bold tracking-tight text-[var(--foreground)] sm:text-[19px]'>
      {title}
      {premium ? (
        <span className='rounded-full bg-[rgb(var(--brand-rgb)/0.1)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]'>
          {t('sponsor.premium')}
        </span>
      ) : null}
    </h2>
  )
}

function historyKey(summary: VisaSponsorData['summary'] | undefined) {
  if (summary?.h1b && summary.greenCard) return 'sponsor.historyBoth'
  if (summary?.h1b) return 'sponsor.historyH1b'
  if (summary?.greenCard) return 'sponsor.historyGreenCard'
  return null
}

/** Company page: titled section with one summary row. Locked → Premium sheet; unlocked → the visa page. */
export function VisaSponsorEntry({
  slug,
  sponsor,
  locked,
}: {
  slug: string
  sponsor: VisaSponsorData | null
  locked: boolean
}) {
  const t = useT('companies')
  const href = useCityPath()
  const [sheet, setSheet] = useState(false)
  const history = historyKey(sponsor?.summary)
  const row = (
    <div className={cn(CARD, 'flex items-center gap-3 px-4 py-3.5 text-left transition hover:bg-black/[0.015] sm:px-5')}>
      <span
        aria-hidden
        className='inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eefaf4] text-[#059669]'
      >
        <ShieldIcon className='size-5' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
          {history ? t(history) : t('sponsor.empty')}
        </span>
        <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>
          {t(locked ? 'sponsor.hintLocked' : 'sponsor.hint')}
        </span>
      </span>
      {locked ? (
        <LockIcon className='size-4 shrink-0 text-[var(--muted)]' />
      ) : (
        <span aria-hidden className='shrink-0 text-[18px] leading-none text-black/25'>
          ›
        </span>
      )}
    </div>
  )
  return (
    <section>
      <SponsorSectionTitle title={t('sponsor.title')} premium />
      <div className='mt-3'>
        {locked ? (
          <button type='button' onClick={() => setSheet(true)} className='block w-full'>
            {row}
          </button>
        ) : (
          <Link href={href(`/companies/${slug}/visa`)} className='block'>
            {row}
          </Link>
        )}
      </div>
      <VisaPremiumSheet open={sheet} onClose={() => setSheet(false)} />
    </section>
  )
}

/** Free members: what Premium includes; the button opens the Premium page (plans + checkout). */
export function VisaPremiumSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT('companies')
  const href = useCityPath()
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('sponsor.premium')}
      scrollable={false}
      footer={
        <Link
          href={href('/premium')}
          onClick={onClose}
          className='flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--brand)] text-[15px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
        >
          {t('sponsor.seePremium')}
        </Link>
      }
    >
      <div className='px-1 pb-2'>
        <p className='text-[19px] font-bold leading-snug tracking-tight text-[var(--foreground)]'>
          {t('sponsor.sheetTitle')}
        </p>
        <ul className='mt-4 flex flex-col gap-2.5'>
          {(['sheetVisa', 'sheetFilings', 'sheetSalary'] as const).map((key) => (
            <li key={key} className='flex items-start gap-2.5 text-[14px] text-[var(--foreground)]'>
              <span aria-hidden className='mt-px font-bold text-[#059669]'>
                ✓
              </span>
              {t(`sponsor.${key}`)}
            </li>
          ))}
        </ul>
        <p className='mt-4 text-[12px] text-[var(--muted)]'>{t('sponsor.sheetSource')}</p>
      </div>
    </BottomSheet>
  )
}

/** The visa page body for Premium: filings (two tiles), base salary by role, source note. */
export function VisaSponsorView({ sponsor }: { sponsor: VisaSponsorData }) {
  const t = useT('companies')
  const years = sponsor.years ?? []
  const roles = sponsor.roles ?? []
  const filed = sponsor.summary.h1b || sponsor.summary.greenCard
  return (
    <div className='flex flex-col gap-3'>
      <SponsorSectionTitle title={t('sponsor.filingsTitle')} premium />
      {!filed ? (
        <p className={cn(CARD, 'px-5 py-4 text-[14px] text-[var(--muted)]')}>{t('sponsor.noRecord')}</p>
      ) : years.length ? (
        <div className='grid grid-cols-2 gap-2.5 sm:gap-3'>
          <StatTile label={t('sponsor.h1bTile')} years={years} pick={(y) => y.h1b} tone='#059669' />
          <StatTile label={t('sponsor.greenCardTile')} years={years} pick={(y) => y.greenCard} tone='var(--brand)' />
        </div>
      ) : null}
      {roles.length ? (
        <>
          <div className='mt-6'>
            <SponsorSectionTitle title={t('sponsor.rolesTitle')} />
            <p className='mt-1 text-[13px] text-[var(--muted)]'>
              {t('sponsor.baseBasis')} · <b className='font-bold text-[var(--foreground)]'>{t('sponsor.baseOnly')}</b>
            </p>
          </div>
          <RolesCard roles={roles} />
        </>
      ) : null}
      <SourceNote source={sponsor.source} />
    </div>
  )
}

function trendText(from: number, to: number) {
  if (from <= 0) return null
  // A drop to a handful still reads as -99%, not -100% (that would mean none at all).
  const pct = Math.max(Math.round(((to - from) / from) * 100), to > 0 ? -99 : -100)
  return pct
}

function StatTile({
  label,
  years,
  pick,
  tone,
}: {
  label: string
  years: VisaSponsorYear[]
  pick: (y: VisaSponsorYear) => number
  tone: string
}) {
  const t = useT('companies')
  const counts = years.map(pick)
  const peak = Math.max(...counts, 1)
  const first = years[0]
  const last = years[years.length - 1]
  const pct = trendText(counts[0] ?? 0, counts[counts.length - 1] ?? 0)
  return (
    <div className={cn(CARD, 'p-4 sm:p-5')}>
      <p className='text-[13px] font-medium text-[var(--muted)]'>{label}</p>
      <p className='mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.03em] text-[var(--foreground)]'>
        {(counts[counts.length - 1] ?? 0).toLocaleString()}
      </p>
      {first && last ? (
        <p className='mt-0.5 text-[11px]'>
          <span
            className={cn(
              'font-semibold',
              pct == null || pct === 0 ? 'text-[var(--muted)]' : pct > 0 ? 'text-[#059669]' : 'text-[#d97706]',
            )}
          >
            {pct == null ? '–' : pct === 0 ? t('sponsor.trendFlat') : `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%`}
          </span>
          <span className='ml-2 text-[var(--muted)]'>
            {t('sponsor.trendSince', { from: first.fy, to: last.fy })}
          </span>
        </p>
      ) : null}
      <div className='mt-4 flex h-[92px] items-end gap-2'>
        {years.map((year) => {
          const n = pick(year)
          const latest = year.fy === last?.fy
          return (
            <div key={year.fy} className='flex flex-1 flex-col items-center gap-1' aria-label={`FY${year.fy} ${n}`}>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  latest ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted)]',
                )}
              >
                {n.toLocaleString()}
              </span>
              <span
                className='w-full rounded-[4px]'
                style={{
                  height: `${Math.max(3, (54 * n) / peak)}px`,
                  background: tone,
                  opacity: latest ? 1 : 0.22,
                }}
              />
              <span className='text-[10px] text-[var(--muted)]'>FY{String(year.fy).slice(-2)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function money(value: number) {
  return value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${Math.round(value)}`
}

function RolesCard({ roles }: { roles: VisaSponsorRole[] }) {
  const t = useT('companies')
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('NY')
  const [kind, setKind] = useState<'h1b' | 'greenCard'>('h1b')
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(
    () => roles.filter((r) => r.kind === kind && r.region === region).sort((a, b) => b.count - a.count),
    [roles, kind, region],
  )
  const q = query.trim().toLowerCase()
  const list = showAll ? (q ? all.filter((r) => r.title.toLowerCase().includes(q)) : all) : all.slice(0, ROLE_PREVIEW)
  const reset = () => {
    setShowAll(false)
    setQuery('')
  }
  return (
    <div className={cn(CARD, 'p-4 sm:p-5')}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value as (typeof REGIONS)[number])
            reset()
          }}
          className='h-9 rounded-full bg-black/[0.04] px-3.5 text-[13px] font-semibold text-[var(--foreground)] outline-none'
        >
          {REGIONS.map((code) => (
            <option key={code} value={code}>
              {t(`sponsor.region${code}`)}
            </option>
          ))}
        </select>
        <div className='inline-flex rounded-full bg-black/[0.05] p-0.5'>
          {(['h1b', 'greenCard'] as const).map((k) => (
            <button
              key={k}
              type='button'
              onClick={() => {
                setKind(k)
                reset()
              }}
              className={cn(
                'h-8 rounded-full px-4 text-[13px] font-semibold transition',
                kind === k ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)]',
              )}
            >
              {t(`sponsor.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <p className='mt-3 text-[11px] text-[var(--muted)]'>
        {t(kind === 'h1b' ? 'sponsor.rolesHintH1b' : 'sponsor.rolesHintGreenCard')}
      </p>
      {showAll && all.length > ROLE_PREVIEW ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sponsor.searchRoles')}
          className='mt-3 h-10 w-full rounded-xl bg-black/[0.04] px-3.5 text-[14px] outline-none placeholder:text-[var(--muted)]'
        />
      ) : null}
      {list.length === 0 ? (
        <p className='py-4 text-[13px] text-[var(--muted)]'>
          {t(all.length ? 'sponsor.searchEmpty' : 'sponsor.rolesEmpty')}
        </p>
      ) : (
        <ul className='mt-1 divide-y divide-black/[0.06]'>
          {list.map((role) => (
            <li key={`${role.kind}-${role.region}-${role.title}`} className='flex items-center gap-3 py-3'>
              <div className='min-w-0 flex-1'>
                <p className='text-[15px] font-medium text-[var(--foreground)]'>{role.title}</p>
                <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                  {t('sponsor.count', { count: role.count, n: role.count.toLocaleString() })}
                </p>
              </div>
              <div className='shrink-0 text-right tabular-nums'>
                {role.median > 0 ? (
                  <>
                    <p className='text-[16px] font-bold text-[var(--foreground)]'>{money(role.median)}</p>
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                      {t('sponsor.range', { low: money(role.p25), high: money(role.p75) })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className='text-[15px] font-bold text-[var(--foreground)]'>
                      {t('sponsor.range', { low: money(role.p25), high: money(role.p75) })}
                    </p>
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>{t('sponsor.offeredRange')}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {all.length > ROLE_PREVIEW ? (
        <button
          type='button'
          onClick={() => {
            setShowAll((v) => !v)
            setQuery('')
          }}
          className='mt-2 h-11 w-full rounded-xl bg-black/[0.04] text-[14px] font-semibold text-[var(--foreground)] transition hover:bg-black/[0.07]'
        >
          {showAll ? t('sponsor.showLess') : t('sponsor.showAll', { count: all.length, n: all.length.toLocaleString() })}
        </button>
      ) : null}
    </div>
  )
}

function SourceNote({ source }: { source: VisaSponsorData['source'] }) {
  const t = useT('companies')
  return (
    <div className='mt-4 flex gap-2 px-1'>
      <BuildingIcon className='mt-0.5 size-3.5 shrink-0 text-[var(--muted)]' />
      <div>
        <p className='text-[12px] font-semibold text-[var(--muted)]'>{t('sponsor.sourceLabel')}</p>
        <p className='mt-1 text-[11px] leading-relaxed text-[var(--muted)]'>
          {t('sponsor.sourceBody', { coverage: source.coverage, through: source.dataThrough })}
        </p>
        <p className='mt-1 text-[11px] leading-relaxed text-[var(--muted)]'>{t('sponsor.sourceCaveat')}</p>
      </div>
    </div>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1.2 13.6-3.4-3.4 1.4-1.4 2 2 4.6-4.6 1.4 1.4-6 6Z' />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z' />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={className} aria-hidden>
      <path d='M3 21h18M4 10h16M12 3 3 8h18l-9-5ZM6 10v8m4-8v8m4-8v8m4-8v8' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}
