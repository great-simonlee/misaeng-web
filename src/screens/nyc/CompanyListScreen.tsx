'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import {
  fetchCompanies,
  type CompanyIndustryOption,
  type CompanyListItem,
} from '@lib/company/client'
import { companyMatchesQuery } from '@lib/company/companyRules'
import { useFormat, useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import {
  CompanyHeroPanel,
  CompanyMark,
  IndustryTag,
  useIndustryLabel,
  tintFor,
  tintGradient,
  type Tint,
} from '@widgets/nyc/CompanyBrand'
import { EmptyState } from '@widgets/nyc/EmptyState'

export function CompanyListScreen() {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const industryLabel = useIndustryLabel()
  const searchRef = useRef<HTMLInputElement>(null)
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [industryOptions, setIndustryOptions] = useState<CompanyIndustryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState<string>('all')
  const [sort, setSort] = useState<SortMode>('name')

  // 정렬 방식은 브라우저에 기억해 둔다 (없거나 막혀 있으면 기본값)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SORT_STORAGE_KEY)
      if (saved === 'name' || saved === 'industry') setSort(saved)
    } catch {}
  }, [])

  function changeSort(next: SortMode) {
    setSort(next)
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, next)
    } catch {}
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCompanies(city)
      // 공고나 후기가 있는 회사만 보여 준다 (둘 다 없는 회사는 아직 목록에 올리지 않는다).
      // 업계 칩·상단 통계·로고 띠도 이 목록 기준이라 함께 맞춰진다. 회사 페이지 주소로는 계속 들어갈 수 있다.
      setCompanies(data.companies.filter((c) => c.reviewCount > 0 || c.postingCount > 0))
      setIndustryOptions(data.industries)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('common.requestFailed'))
    } finally {
      setLoading(false)
    }
  }, [city, t])

  useEffect(() => {
    void load()
  }, [load])

  // '/' 로 어디서든 검색창에 포커스
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 업계별 회사 수. 실제로 회사가 있는 업계만, 관리자가 정한 순서대로 칩으로 보여준다.
  const industryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of companies) counts.set(c.industry, (counts.get(c.industry) ?? 0) + 1)
    return counts
  }, [companies])

  const industries = useMemo(
    () => industryOptions.filter((option) => industryCounts.has(option.code)),
    [industryOptions, industryCounts]
  )

  const filtered = useMemo(
    () =>
      companies.filter(
        (c) => (industry === 'all' || c.industry === industry) && companyMatchesQuery(c, query)
      ),
    [companies, industry, query]
  )

  const totalReviews = useMemo(
    () => companies.reduce((sum, c) => sum + c.reviewCount, 0),
    [companies]
  )
  const totalPostings = useMemo(
    () => companies.reduce((sum, c) => sum + (c.postingCount || 0), 0),
    [companies]
  )

  // 히어로 로고 띠: 로고가 있는 회사 먼저
  const marquee = useMemo(
    () => [...companies].sort((a, b) => Number(!!b.logoUrl) - Number(!!a.logoUrl)).slice(0, 18),
    [companies]
  )

  // API가 featured 먼저, 그다음 이름순으로 준다.
  const featured = useMemo(() => filtered.filter((c) => c.isFeatured), [filtered])
  const groups = useMemo(() => {
    const rest = filtered.filter((c) => !c.isFeatured)
    return sort === 'industry'
      ? groupByIndustry(rest, industryOptions, industryLabel)
      : groupByInitial(rest)
  }, [filtered, sort, industryOptions, industryLabel])
  const hrefFor = (slug: string) => href(`/companies/${slug}`)

  return (
    <BoardPageShell width='wide'>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <div className='flex items-center justify-between gap-3'>
          <Link
            href={href('/job-review')}
            className='inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
          >
            <span aria-hidden>‹</span> {t('list.backToJobReviews')}
          </Link>
          <Link
            href={href('/companies/postings')}
            className='inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--brand)] hover:underline sm:text-[13px]'
          >
            {t('postings.listLink')} <span aria-hidden>›</span>
          </Link>
        </div>

        <CompanyHeroPanel className='mt-3'>
          <div className='relative'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
              <div className='min-w-0'>
                <h1 className='text-[1.4rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[1.6rem]'>
                  {t('list.title')}
                </h1>
                <p className='mt-1.5 text-[13px] leading-relaxed text-white/55 sm:text-[14px]'>
                  {t('list.intro')}
                </p>
              </div>
              <dl className='flex shrink-0 items-center gap-3 text-[12px] sm:text-[13px]'>
                <HeroStat
                  label={t('list.statCompanies')}
                  value={loading ? null : companies.length}
                />
                <span aria-hidden className='h-3 w-px bg-white/15' />
                <HeroStat
                  label={t('list.statIndustries')}
                  value={loading ? null : industries.length}
                />
                <span aria-hidden className='h-3 w-px bg-white/15' />
                <HeroStat
                  label={t('list.statReviews')}
                  value={loading ? null : totalReviews}
                  accent
                />
                {totalPostings > 0 ? (
                  <>
                    <span aria-hidden className='h-3 w-px bg-white/15' />
                    <HeroStat label={t('postings.statPostings')} value={loading ? null : totalPostings} accent />
                  </>
                ) : null}
              </dl>
            </div>

            <div className='group/search relative mt-5'>
              <div
                aria-hidden
                className='absolute -inset-px rounded-2xl bg-gradient-to-r from-[var(--brand)]/0 via-[var(--brand)]/60 to-[#ffb59e]/0 opacity-0 blur-md transition duration-500 group-focus-within/search:opacity-100'
              />
              <div className='relative flex items-center rounded-2xl bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]'>
                <SearchIcon className='pointer-events-none ml-4 size-[18px] shrink-0 text-[var(--muted)] transition group-focus-within/search:text-[var(--brand)]' />
                <input
                  ref={searchRef}
                  type='search'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('list.searchPlaceholder')}
                  className='h-[52px] min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] [&::-webkit-search-cancel-button]:hidden'
                />
                {query ? (
                  <button
                    type='button'
                    aria-label={t('list.clearSearch')}
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                    className='mr-3 inline-flex size-7 items-center justify-center rounded-full bg-[#f1f2f4] text-[var(--muted)] transition hover:bg-[#e6e8eb] hover:text-[var(--foreground)]'
                  >
                    <CloseIcon className='size-3.5' />
                  </button>
                ) : (
                  <kbd className='mr-4 hidden h-6 min-w-6 items-center justify-center rounded-md border border-black/10 bg-[#f8fafc] px-1.5 font-sans text-[12px] font-semibold text-[var(--muted)] sm:inline-flex'>
                    /
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {marquee.length >= 6 ? (
            <div
              className='partner-marquee relative -mx-5 mt-6 overflow-hidden sm:-mx-7 sm:mt-8'
              aria-hidden
            >
              <div
                className='partner-marquee-track flex w-max gap-3'
                style={{ animationDuration: '60s' }}
              >
                {[...marquee, ...marquee].map((c, i) => (
                  <div
                    key={`${c.slug}-${i}`}
                    className='flex shrink-0 items-center gap-2.5 rounded-full bg-white/[0.06] py-1.5 pl-1.5 pr-4 ring-1 ring-white/10'
                  >
                    <CompanyMark company={c} className='size-7 rounded-full text-[11px]' />
                    <span className='text-[12px] font-medium text-white/75'>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CompanyHeroPanel>

        {industries.length > 1 ? (
          <ChipScrollRow
            className='mt-5'
            ariaLabel={t('list.statIndustries')}
            leading={
              <IndustryChip
                label={t('list.allIndustries')}
                count={companies.length}
                active={industry === 'all'}
                onClick={() => setIndustry('all')}
              />
            }
          >
            {industries.map(({ code, label }) => (
              <IndustryChip
                key={code}
                label={industryLabel(code, label)}
                count={industryCounts.get(code) ?? 0}
                tint={tintFor(code)}
                active={industry === code}
                onClick={() => setIndustry(code)}
              />
            ))}
          </ChipScrollRow>
        ) : null}
      </header>

      <section className='mt-6 pb-20 sm:mt-8'>
        {loading ? (
          <div className='py-16'>
            <LoadingState label={t('list.loading')} />
          </div>
        ) : error ? (
          <EmptyState
            title={t('list.loadError')}
            description={error}
            onAction={() => void load()}
            actionLabel={t('common.retry')}
          />
        ) : companies.length === 0 ? (
          <EmptyState title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('list.noMatchTitle')}
            description={t('list.noMatchDescription')}
          />
        ) : (
          <div className='flex flex-col gap-10'>
            <div className='-mb-4 flex items-center justify-between gap-3'>
              <p className='text-[12px] font-medium text-[var(--muted)] sm:text-[13px]'>
                {t('list.resultCount', { count: filtered.length })}
              </p>
              <SortToggle value={sort} onChange={changeSort} />
            </div>

            {featured.length ? (
              <div>
                <SectionTitle>{t('list.featuredTitle')}</SectionTitle>
                <ul className='grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'>
                  {featured.map((company, i) => (
                    <li key={company.slug} className={cardEnter} style={enterDelay(i)}>
                      <FeaturedCard company={company} href={hrefFor(company.slug)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {groups.length ? (
              <div>
                {featured.length ? (
                  <SectionTitle>{t('list.allCompaniesTitle')}</SectionTitle>
                ) : null}
                <div className='flex flex-col gap-7'>
                  {groups.map(({ key, label, items }, gi) =>
                    sort === 'industry' ? (
                      <div key={key}>
                        <div className='mb-3 flex items-center gap-2.5'>
                          <span
                            aria-hidden
                            className='size-5 shrink-0 rounded-md shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.1)]'
                            style={{
                              backgroundImage: tintGradient(tintFor(key)),
                            }}
                          />
                          <h3 className='text-[15px] font-bold tracking-tight text-[var(--foreground)] sm:text-[17px]'>
                            {label}
                          </h3>
                          <span className='text-[13px] font-semibold tabular-nums text-[var(--muted)]'>
                            {items.length}
                          </span>
                          <span
                            aria-hidden
                            className='h-px flex-1 bg-gradient-to-r from-black/10 to-transparent'
                          />
                        </div>
                        <CompanyCardGrid
                          companies={items}
                          hrefFor={hrefFor}
                          delayOffset={gi * 3}
                          hideIndustry
                        />
                      </div>
                    ) : (
                      <div
                        key={key}
                        className='grid grid-cols-1 gap-y-2 sm:grid-cols-[3.5rem_1fr] sm:gap-x-5 sm:gap-y-0'
                      >
                        {/* 모바일: 그룹 위 제목 (카드 폭을 지키려고 옆 열을 쓰지 않는다). 넓은 화면: 왼쪽 고정 글자 */}
                        <div className='relative'>
                          <span
                            aria-hidden
                            data-ui='index-letter'
                            className='block bg-gradient-to-b from-[var(--foreground)] to-[var(--foreground)]/25 bg-clip-text text-[1.35rem] font-black leading-none tracking-[-0.06em] text-transparent sm:sticky sm:top-24 sm:text-[2.75rem]'
                          >
                            {label}
                          </span>
                        </div>
                        <CompanyCardGrid companies={items} hrefFor={hrefFor} delayOffset={gi * 3} />
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </BoardPageShell>
  )
}

type SortMode = 'name' | 'industry'
const SORT_STORAGE_KEY = 'misaeng:companies:sort'

function SortToggle({ value, onChange }: { value: SortMode; onChange: (next: SortMode) => void }) {
  const t = useT('companies')
  const options: { value: SortMode; label: string; icon: ReactNode }[] = [
    { value: 'name', label: t('list.sortByName'), icon: <AzIcon className='size-3.5' /> },
    {
      value: 'industry',
      label: t('list.sortByIndustry'),
      icon: <LayersIcon className='size-3.5' />,
    },
  ]
  return (
    <div
      role='radiogroup'
      aria-label={t('list.sortLabel')}
      className='relative inline-flex shrink-0 rounded-full bg-[#f1f2f4] p-0.5'
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_0_0_0.5px_rgba(15,23,42,0.06)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          value === 'industry' && 'translate-x-full'
        )}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          role='radio'
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-[12px] font-semibold touch-manipulation transition-colors sm:text-[13px]',
            value === option.value
              ? 'text-[var(--foreground)]'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CompanyCardGrid({
  companies,
  hrefFor,
  delayOffset,
  hideIndustry = false,
}: {
  companies: CompanyListItem[]
  hrefFor: (slug: string) => string
  delayOffset: number
  /** 업계별 보기에서는 그룹 제목과 겹치므로 숨긴다 */
  hideIndustry?: boolean
}) {
  return (
    <ul className='grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
      {companies.map((company, i) => (
        <li key={company.slug} className={cardEnter} style={enterDelay(delayOffset + i)}>
          <CompanyCard company={company} href={hrefFor(company.slug)} hideIndustry={hideIndustry} />
        </li>
      ))}
    </ul>
  )
}

const cardEnter = 'motion-safe:animate-[sheetUp_480ms_cubic-bezier(0.22,1,0.36,1)_both]'

function enterDelay(i: number): CSSProperties {
  return { animationDelay: `${Math.min(i, 14) * 35}ms` }
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className='mb-4 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]'>
      {children}
      <span aria-hidden className='h-px flex-1 bg-gradient-to-r from-black/10 to-transparent' />
    </h2>
  )
}

function HeroStat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number | null
  accent?: boolean
}) {
  const format = useFormat()
  return (
    <div className='flex items-baseline gap-1'>
      <dd data-ui={accent ? 'hero-stat-accent' : undefined} className={cn('font-semibold tabular-nums', accent ? 'text-[#ff8a65]' : 'text-white')}>
        {value === null ? (
          <span className='inline-block h-3 w-5 animate-pulse rounded bg-white/15 align-middle' />
        ) : (
          format.number(value)
        )}
      </dd>
      <dt className='text-white/45'>{label}</dt>
    </div>
  )
}

function IndustryChip({
  label,
  count,
  active,
  tint,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  tint?: Tint
  onClick: () => void
}) {
  return (
    <button
      type='button'
      role='option'
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3.5 pr-2 text-[13px] font-semibold leading-none touch-manipulation transition duration-200 active:scale-[0.97]',
        active
          ? 'bg-[var(--foreground)] text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)]'
          : 'bg-[#f3f4f6] text-[var(--muted-foreground)] hover:bg-[#e9ebee] hover:text-[var(--foreground)]'
      )}
    >
      {tint ? (
        <span
          aria-hidden
          className='size-1.5 rounded-full'
          style={{ backgroundColor: active ? '#fff' : tint.dot }}
        />
      ) : null}
      {label}
      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums',
          active ? 'bg-white/15 text-white' : 'bg-white text-[var(--muted)]'
        )}
      >
        {count}
      </span>
    </button>
  )
}

function CompanyCard({
  company,
  href,
  hideIndustry = false,
}: {
  company: CompanyListItem
  href: string
  hideIndustry?: boolean
}) {
  return (
    <Link
      href={href}
      className='group relative flex h-full flex-col rounded-[1.25rem] bg-white p-3.5 ring-1 ring-black/[0.06] touch-manipulation transition duration-200 ease-out hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.16)] hover:ring-black/[0.12] active:scale-[0.99] sm:p-4'
    >
      <div className='flex items-start justify-between gap-2'>
        <CompanyMark company={company} className='size-10 text-[16px]' />
        {hideIndustry ? null : (
          <span className='flex min-w-0 justify-end'>
            <IndustryTag label={company.industryLabel} industry={company.industry} />
          </span>
        )}
      </div>
      <span className='mt-3 line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[15px]'>
        {company.name}
      </span>
      {company.reviewCount > 0 || company.postingCount > 0 ? (
        <span className='mt-2 flex flex-wrap gap-1'>
          {company.postingCount > 0 ? <PostingBadge count={company.postingCount} /> : null}
          {company.reviewCount > 0 ? <ReviewBadge count={company.reviewCount} /> : null}
        </span>
      ) : null}
    </Link>
  )
}

function FeaturedCard({ company, href }: { company: CompanyListItem; href: string }) {
  const industryLabel = useIndustryLabel()
  return (
    <Link
      href={href}
      data-ui='featured-card'
      className='group relative block h-full rounded-[1.4rem] bg-gradient-to-br from-[var(--brand)] via-[#ff9a76] to-[#6d5dfc] p-px touch-manipulation transition duration-200 hover:shadow-[0_8px_22px_-10px_rgb(var(--brand-rgb)/0.3)] active:scale-[0.99]'
    >
      <span className='relative flex h-full items-center gap-4 overflow-hidden rounded-[calc(1.4rem-1px)] bg-white p-4 sm:p-5'>
        <span
          aria-hidden
          data-ui='hero-decor'
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgb(var(--brand-rgb)/0.10),transparent_55%)]'
        />
        <CompanyMark company={company} className='relative size-14 text-[20px]' />
        <span className='relative min-w-0 flex-1'>
          <span className='block truncate text-[16px] font-bold tracking-tight text-[var(--foreground)] sm:text-[17px]'>
            {company.name}
          </span>
          <span className='mt-1.5 flex flex-wrap items-center gap-1.5'>
            <span className='text-[12px] font-medium text-[var(--muted)]'>
              {industryLabel(company.industry, company.industryLabel)}
            </span>
            {company.reviewCount > 0 ? <ReviewBadge count={company.reviewCount} /> : null}
            {company.postingCount > 0 ? <PostingBadge count={company.postingCount} /> : null}
          </span>
        </span>
        <ArrowIcon className='relative size-4 shrink-0 text-[var(--muted)] transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--brand)]' />
      </span>
    </Link>
  )
}

function PostingBadge({ count }: { count: number }) {
  const t = useT('companies')
  return (
    <span className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-[var(--foreground)] py-[3px] pl-1.5 pr-2 text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.35)]'>
      <BriefcaseIcon className='size-3' />
      {t('postings.postingCount', { count })}
    </span>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <rect x='3' y='7' width='18' height='13' rx='2' />
      <path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18' />
    </svg>
  )
}

function ReviewBadge({ count }: { count: number }) {
  const t = useT('companies')
  return (
    <span className='inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-gradient-to-br from-brand-bright to-[var(--brand)] py-[3px] pl-1.5 pr-2 text-[11px] font-bold leading-none text-white shadow-[0_2px_6px_-1px_rgb(var(--brand-rgb)/0.45)]'>
      <ChatIcon className='size-3' />
      {t('list.reviewCount', { count })}
    </span>
  )
}

const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

type CompanyGroup = { key: string; label: string; items: CompanyListItem[] }

/** 영문은 첫 글자, 한글은 초성, 나머지는 # 으로 묶는다 (입력 순서 유지) */
function groupByInitial(companies: CompanyListItem[]): CompanyGroup[] {
  const groups: CompanyGroup[] = []
  for (const company of companies) {
    const first = Array.from(company.name.trim())[0] ?? ''
    const code = first.charCodeAt(0)
    const key = /[a-z]/i.test(first)
      ? first.toUpperCase()
      : code >= 0xac00 && code <= 0xd7a3
        ? CHOSEONG[Math.floor((code - 0xac00) / 588)]
        : '#'
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(company)
    else groups.push({ key, label: key, items: [company] })
  }
  return groups
}

/** 업계별로 묶는다. 업계 순서는 관리자가 정한 순서, 목록에 없는 업계는 맨 뒤 (그룹 안은 입력 순서 유지) */
function groupByIndustry(
  companies: CompanyListItem[],
  options: CompanyIndustryOption[],
  industryLabel: (code: string, fallback: string) => string
): CompanyGroup[] {
  const byCode = new Map<string, CompanyGroup>()
  for (const company of companies) {
    const group = byCode.get(company.industry)
    if (group) group.items.push(company)
    else
      byCode.set(company.industry, {
        key: company.industry,
        label: industryLabel(company.industry, company.industryLabel),
        items: [company],
      })
  }
  const order = new Map(options.map((option, i) => [option.code, i]))
  return [...byCode.values()].sort(
    (a, b) => (order.get(a.key) ?? Infinity) - (order.get(b.key) ?? Infinity)
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      className={className}
      aria-hidden
    >
      <circle cx='11' cy='11' r='7' />
      <path d='m20 20-3.5-3.5' />
    </svg>
  )
}

function AzIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M3 17 6.5 7 10 17M4.2 13.6h4.6M14 7h6l-6 10h6' />
    </svg>
  )
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='m12 3 9 5-9 5-9-5 9-5Z' />
      <path d='m3 13 9 5 9-5' />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z' />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.4}
      strokeLinecap='round'
      className={className}
      aria-hidden
    >
      <path d='M6 6l12 12M18 6 6 18' />
    </svg>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M5 12h14M13 6l6 6-6 6' />
    </svg>
  )
}
