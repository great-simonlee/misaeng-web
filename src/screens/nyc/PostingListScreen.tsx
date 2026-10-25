'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { cityFirst, fetchPostings, matchesKind, type PostingKind, type PublicPosting } from '@lib/company/postings'
import { BRAND_CONFIG } from '@lib/brand'
import { JOB_FUNCTION_LABELS, JOB_FUNCTIONS, type JobFunction } from '@lib/constants/postingCopy'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CompanyHeroPanel } from '@widgets/nyc/CompanyBrand'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { kindCounts, PostingRows } from '@widgets/nyc/PostingCard'

/** 한 번에 보여 주는 공고 수 ("더 보기"로 늘린다) */
const PAGE_SIZE = 20

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '')

/** 승인된 인턴·신입 공고 전체 (/[city]/companies/postings) */
export function PostingListScreen() {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const [postings, setPostings] = useState<PublicPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<PostingKind>('all')
  const [region, setRegion] = useState('all')
  const [jobFunction, setJobFunction] = useState<'all' | JobFunction>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  // 필터가 바뀌면 처음 PAGE_SIZE개부터 다시
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [kind, region, jobFunction, query])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPostings(await fetchPostings(city))
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('postings.loadError'))
    } finally {
      setLoading(false)
    }
  }, [city, t])

  useEffect(() => {
    void load()
  }, [load])

  // 공고가 많은 지역부터
  const regions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of postings) for (const r of p.regions) counts.set(r, (counts.get(r) ?? 0) + 1)
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    // 보고 있는 도시(뉴욕 등)의 지역 칩을 맨 앞에, 나머지는 공고 수 순서 그대로
    return cityFirst(sorted.map(([name]) => name), city).map((name) => [name, counts.get(name) ?? 0] as const)
  }, [postings, city])

  const filtered = useMemo(() => {
    const key = normalize(query)
    return postings.filter(
      (p) =>
        matchesKind(p, kind) &&
        (region === 'all' || p.regions.includes(region)) &&
        (jobFunction === 'all' || p.jobFunction === jobFunction) &&
        (!key || normalize(`${p.company.name} ${p.title}`).includes(key)),
    )
  }, [postings, kind, region, jobFunction, query])

  // 공고가 있는 직무만, 정해진 순서대로
  const functions = useMemo(
    () =>
      JOB_FUNCTIONS.map((code) => [code, postings.filter((p) => p.jobFunction === code).length] as const).filter(
        ([, count]) => count > 0,
      ),
    [postings],
  )

  // 구분: 인턴·신입·한국어 우대·한국 근무 (공고가 있는 것만)
  const kinds = useMemo(() => kindCounts(postings, t), [postings, t])

  return (
    <BoardPageShell width='wide'>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href('/companies')}
          className='flex w-fit items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> {t('postings.backToCompanies')}
        </Link>
        <CompanyHeroPanel className='mt-3'>
          <h1 className='text-[1.4rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[1.6rem]'>
            {t('postings.listTitle')}
          </h1>
          <p className='mt-1.5 text-[13px] leading-relaxed text-white/55 sm:text-[14px]'>{t('postings.listIntro', { brand: BRAND_CONFIG.name })}</p>
          <input
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('postings.searchPlaceholder')}
            className='mt-5 h-[52px] w-full rounded-2xl bg-white px-4 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]'
          />
        </CompanyHeroPanel>
      </header>

      <div className='mt-6 space-y-3'>
        <ChipScrollRow
          leading={<Chip label={t('postings.allLevels')} count={postings.length} active={kind === 'all'} onClick={() => setKind('all')} />}
        >
          {kinds.map(([id, label, count]) => (
            <Chip key={id} label={label} count={count} active={kind === id} onClick={() => setKind(id)} />
          ))}
        </ChipScrollRow>
        {functions.length > 1 ? (
          <ChipScrollRow
            leading={
              <Chip
                label={t('postings.allFunctions')}
                active={jobFunction === 'all'}
                onClick={() => setJobFunction('all')}
              />
            }
          >
            {functions.map(([code, count]) => (
              <Chip
                key={code}
                label={t(JOB_FUNCTION_LABELS[code])}
                count={count}
                active={jobFunction === code}
                onClick={() => setJobFunction(code)}
              />
            ))}
          </ChipScrollRow>
        ) : null}
        {regions.length > 1 ? (
          <ChipScrollRow
            leading={
              <Chip label={t('postings.allRegions')} active={region === 'all'} onClick={() => setRegion('all')} />
            }
          >
            {regions.map(([name, count]) => (
              <Chip key={name} label={name} count={count} active={region === name} onClick={() => setRegion(name)} />
            ))}
          </ChipScrollRow>
        ) : null}
      </div>

      <div className='mt-5 pb-20'>
        {loading ? (
          <div className='py-12'>
            <LoadingState />
          </div>
        ) : error ? (
          <EmptyState
            title={t('postings.loadError')}
            description={error}
            onAction={() => void load()}
            actionLabel={t('common.retry')}
          />
        ) : postings.length === 0 ? (
          <EmptyState title={t('postings.emptyTitle')} description={t('postings.emptyDescription')} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('postings.noMatchTitle')} description={t('postings.noMatchDescription')} />
        ) : (
          <>
            <p className='mb-3 text-[13px] font-medium text-[var(--muted)]'>{t('postings.resultCount', { count: filtered.length })}</p>
            <PostingRows postings={filtered.slice(0, limit)} showCompany />
            {filtered.length > limit ? (
              <div className='mt-4 flex justify-center'>
                <button
                  type='button'
                  onClick={() => setLimit((n) => n + PAGE_SIZE)}
                  className='inline-flex h-10 items-center rounded-full bg-[#f3f4f6] px-5 text-[13px] font-semibold text-[var(--muted-foreground)] transition hover:bg-[#e9ebee] hover:text-[var(--foreground)]'
                >
                  {t('postings.loadMore', { count: filtered.length - limit })}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </BoardPageShell>
  )
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold leading-none touch-manipulation transition duration-200 active:scale-[0.97]',
        count !== undefined && 'pr-2',
        active
          ? 'bg-[var(--foreground)] text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)]'
          : 'bg-[#f3f4f6] text-[var(--muted-foreground)] hover:bg-[#e9ebee] hover:text-[var(--foreground)]',
      )}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums',
            active ? 'bg-white/15 text-white' : 'bg-white text-[var(--muted)]',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
