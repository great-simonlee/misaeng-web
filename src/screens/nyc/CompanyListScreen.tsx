'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { fetchCompanies, type CompanyListItem } from '@lib/company/client'
import { companyMatchesQuery } from '@lib/company/companyRules'
import { COMPANY_INDUSTRIES, industryLabel } from '@lib/constants/company'
import { companyCopy } from '@lib/constants/companyCopy'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CompanyLogo } from '@widgets/nyc/CompanyLogo'
import { EmptyState } from '@widgets/nyc/EmptyState'

export function CompanyListScreen() {
  const city = useCity()
  const href = useCityPath()
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCompanies(await fetchCompanies(city))
    } catch (e) {
      setError(e instanceof Error ? e.message : companyCopy.loadError)
    } finally {
      setLoading(false)
    }
  }, [city])

  useEffect(() => {
    void load()
  }, [load])

  // 실제로 회사가 있는 업계만 칩으로 보여준다.
  const industries = useMemo(() => {
    const present = new Set(companies.map((c) => c.industry))
    return COMPANY_INDUSTRIES.filter((code) => present.has(code))
  }, [companies])

  const filtered = useMemo(
    () =>
      companies.filter(
        (c) => (industry === 'all' || c.industry === industry) && companyMatchesQuery(c, query),
      ),
    [companies, industry, query],
  )

  // API가 featured 먼저, 그다음 이름순으로 준다.
  const featured = filtered.filter((c) => c.isFeatured)
  const others = filtered.filter((c) => !c.isFeatured)

  return (
    <BoardPageShell>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href('/job-review')}
          className='inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> 면접 · 취업 후기
        </Link>
        <h1 className='mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem] lg:text-[2rem]'>
          {companyCopy.listTitle}
        </h1>
        <p className='mt-3 max-w-2xl text-[13px] leading-[1.45] text-[var(--muted)] sm:mt-3.5 sm:text-[14px] sm:leading-relaxed lg:text-[15px]'>
          {companyCopy.listIntro}
        </p>

        <div className='relative mt-4'>
          <SearchIcon className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]' />
          <input
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={companyCopy.searchPlaceholder}
            className='h-11 w-full rounded-full border border-black/[0.08] bg-white pl-10 pr-4 text-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)]/40'
          />
        </div>

        {industries.length > 1 ? (
          <ChipScrollRow className='mt-3'>
            {['all', ...industries].map((code) => (
              <button
                key={code}
                type='button'
                onClick={() => setIndustry(code)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-medium leading-none touch-manipulation transition sm:h-9 sm:px-3.5 sm:text-[13px]',
                  industry === code
                    ? 'border-[var(--foreground)] bg-white text-[var(--foreground)] shadow-sm'
                    : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
                )}
              >
                {code === 'all' ? companyCopy.allIndustries : industryLabel(code)}
              </button>
            ))}
          </ChipScrollRow>
        ) : null}
      </header>

      <section className='mt-5 pb-16 sm:mt-6'>
        {loading ? (
          <div className='py-16'>
            <LoadingState label={companyCopy.loading} />
          </div>
        ) : error ? (
          <EmptyState
            title={companyCopy.loadError}
            description={error}
            onAction={() => void load()}
            actionLabel={companyCopy.retry}
          />
        ) : companies.length === 0 ? (
          <EmptyState title={companyCopy.emptyTitle} description={companyCopy.emptyDescription} />
        ) : filtered.length === 0 ? (
          <EmptyState title={companyCopy.noMatchTitle} description={companyCopy.noMatchDescription} />
        ) : (
          <div className='flex flex-col gap-8'>
            {featured.length ? (
              <CompanyGrid
                title={companyCopy.featuredTitle}
                companies={featured}
                hrefFor={(slug) => href(`/companies/${slug}`)}
                featured
              />
            ) : null}
            {others.length ? (
              <CompanyGrid
                title={featured.length ? companyCopy.allCompaniesTitle : null}
                companies={others}
                hrefFor={(slug) => href(`/companies/${slug}`)}
              />
            ) : null}
          </div>
        )}
      </section>
    </BoardPageShell>
  )
}

function CompanyGrid({
  title,
  companies,
  hrefFor,
  featured = false,
}: {
  title: string | null
  companies: CompanyListItem[]
  hrefFor: (slug: string) => string
  featured?: boolean
}) {
  return (
    <div>
      {title ? (
        <h2 className='mb-3 text-[14px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[15px]'>{title}</h2>
      ) : null}
      <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4'>
        {companies.map((company) => (
          <li key={company.slug}>
            <Link
              href={hrefFor(company.slug)}
              className={cn(
                'flex h-full flex-col items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_rgba(15,23,42,0.045)] ring-1 touch-manipulation transition hover:ring-[var(--brand)]/25 active:scale-[0.99]',
                featured ? 'ring-[var(--brand)]/20' : 'ring-black/[0.04]',
              )}
            >
              <CompanyLogo name={company.name} logoUrl={company.logoUrl} className='size-12 text-lg' />
              <span className='min-w-0'>
                <span className='line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[15px]'>
                  {company.name}
                </span>
                <span className='mt-1 block text-[12px] text-[var(--muted)]'>
                  {industryLabel(company.industry)}
                  {company.reviewCount > 0 ? (
                    <>
                      {' · '}
                      <span className='font-medium text-[var(--brand)]'>
                        {companyCopy.reviewCount(company.reviewCount)}
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' className={className} aria-hidden>
      <circle cx='11' cy='11' r='7' />
      <path d='m20 20-3.5-3.5' />
    </svg>
  )
}
