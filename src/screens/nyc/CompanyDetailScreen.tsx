'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import {
  fetchCompany,
  fetchCompanyReviews,
  trackCompanyClick,
  type CompanyDetail,
  type CompanyReview,
} from '@lib/company/client'
import { getJobReviewTypeStyle, JOB_REVIEW_TYPES } from '@lib/community/jobReview'
import { countryLabel, industryLabel } from '@lib/constants/company'
import { companyCopy } from '@lib/constants/companyCopy'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CompanyLogo } from '@widgets/nyc/CompanyLogo'
import { CompanyVisaInfo } from '@widgets/nyc/CompanyVisaInfo'
import { EmptyState } from '@widgets/nyc/EmptyState'

const PRIMARY_LINK =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)] active:scale-[0.98]'
const SECONDARY_LINK =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-black/[0.1] bg-white px-5 text-[14px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:border-black/20 active:scale-[0.98]'

function formatDate(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  })
}

export function CompanyDetailScreen({ slug }: { slug: string }) {
  const city = useCity()
  const href = useCityPath()
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [reviews, setReviews] = useState<CompanyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [reviewsError, setReviewsError] = useState('')
  const [type, setType] = useState<string>('all')
  const [includeSubsidiaries, setIncludeSubsidiaries] = useState(false)

  const loadCompany = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      setDetail(await fetchCompany(slug, city))
    } catch (e) {
      if ((e as { status?: number }).status === 404) setNotFound(true)
      else setError(e instanceof Error ? e.message : companyCopy.loadError)
    } finally {
      setLoading(false)
    }
  }, [slug, city])

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    setReviewsError('')
    try {
      setReviews(await fetchCompanyReviews(slug, city, { includeSubsidiaries }))
    } catch (e) {
      setReviewsError(e instanceof Error ? e.message : companyCopy.reviewsError)
    } finally {
      setReviewsLoading(false)
    }
  }, [slug, city, includeSubsidiaries])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const presentTypes = useMemo(() => {
    const present = new Set(reviews.map((r) => r.meta.jobReviewType))
    return JOB_REVIEW_TYPES.filter((t) => present.has(t.id))
  }, [reviews])

  const visibleReviews = useMemo(
    () => (type === 'all' ? reviews : reviews.filter((r) => r.meta.jobReviewType === type)),
    [reviews, type],
  )

  if (loading) {
    return (
      <BoardPageShell>
        <div className='py-24'>
          <LoadingState label={companyCopy.loading} />
        </div>
      </BoardPageShell>
    )
  }

  if (notFound || error || !detail) {
    return (
      <BoardPageShell>
        <div className='pt-8'>
          <EmptyState
            title={notFound ? companyCopy.notFoundTitle : companyCopy.loadError}
            description={notFound ? companyCopy.notFoundDescription : error}
            actionHref={href('/companies')}
            actionLabel={companyCopy.backToList}
          />
        </div>
      </BoardPageShell>
    )
  }

  const { company, parent, children } = detail

  return (
    <BoardPageShell>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href('/companies')}
          className='inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> {companyCopy.backToList}
        </Link>

        <div className='mt-3 flex items-center gap-4'>
          <CompanyLogo name={company.name} logoUrl={company.logoUrl} className='size-16 text-2xl sm:size-[72px]' />
          <div className='min-w-0'>
            <h1 className='text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.75rem]'>
              {company.name}
            </h1>
            <p className='mt-1 text-[13px] text-[var(--muted)] sm:text-[14px]'>
              {industryLabel(company.industry)}
              {parent ? (
                <>
                  {' · '}
                  {companyCopy.parentLabel}{' '}
                  <Link href={href(`/companies/${parent.slug}`)} className='font-medium text-[var(--foreground)] underline-offset-2 hover:underline'>
                    {parent.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {/* 학생·인턴·신입 페이지가 있으면 그게 메인 버튼, 공식 채용 페이지는 보조 */}
        <div className='mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
          {company.studentsUrl ? (
            <a
              href={company.studentsUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => trackCompanyClick(company.slug, 'students')}
              className={PRIMARY_LINK}
            >
              {companyCopy.studentsButton}
              <ExternalIcon className='size-4' />
            </a>
          ) : null}
          <a
            href={company.careersUrl}
            target='_blank'
            rel='noopener noreferrer'
            onClick={() => trackCompanyClick(company.slug, 'careers')}
            className={company.studentsUrl ? SECONDARY_LINK : PRIMARY_LINK}
          >
            {companyCopy.careersButton}
            <ExternalIcon className='size-4' />
          </a>
          {company.country ? (
            <span className='inline-flex items-center justify-center self-start rounded-full bg-[#f4f5f7] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] sm:self-auto'>
              {companyCopy.countryBadge(countryLabel(company.country))}
            </span>
          ) : null}
        </div>
        <p className='mt-2.5 text-[12px] leading-relaxed text-[var(--muted)]'>{companyCopy.careersNotice}</p>

        {children.length ? (
          <div className='mt-4 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--muted)]'>
            <span>{companyCopy.subsidiariesLabel}</span>
            {children.map((child) => (
              <Link
                key={child.slug}
                href={href(`/companies/${child.slug}`)}
                className='rounded-full bg-[#f4f5f7] px-2.5 py-1 font-medium text-[var(--foreground)] hover:bg-[#eceef1]'
              >
                {child.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <CompanyVisaInfo visa={company.visa} />

      <section className='mt-8 pb-16'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-[1.05rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.15rem]'>
            {companyCopy.reviewsTitle}
            {!reviewsLoading ? (
              <span className='ml-1.5 text-[var(--muted)]'>{reviews.length}</span>
            ) : null}
          </h2>
          {children.length ? (
            <label className='inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] sm:text-[13px]'>
              <input
                type='checkbox'
                checked={includeSubsidiaries}
                onChange={(e) => setIncludeSubsidiaries(e.target.checked)}
                className='accent-[var(--brand)]'
              />
              {companyCopy.includeSubsidiaries}
            </label>
          ) : null}
        </div>

        {presentTypes.length > 1 ? (
          <ChipScrollRow className='mt-3'>
            {[{ id: 'all', label: companyCopy.allTypes }, ...presentTypes].map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setType(item.id)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-medium leading-none touch-manipulation transition sm:h-9 sm:px-3.5 sm:text-[13px]',
                  type === item.id
                    ? 'border-[var(--foreground)] bg-white text-[var(--foreground)] shadow-sm'
                    : 'border-black/[0.08] bg-white text-[var(--foreground)] hover:border-black/15',
                )}
              >
                {item.label}
              </button>
            ))}
          </ChipScrollRow>
        ) : null}

        <div className='mt-4'>
          {reviewsLoading ? (
            <div className='py-12'>
              <LoadingState />
            </div>
          ) : reviewsError ? (
            <EmptyState
              title={companyCopy.reviewsError}
              description={reviewsError}
              onAction={() => void loadReviews()}
              actionLabel={companyCopy.retry}
            />
          ) : visibleReviews.length === 0 ? (
            <EmptyState
              title={companyCopy.reviewsEmpty}
              description={company.name}
              actionHref={href('/job-review/new')}
              actionLabel={companyCopy.writeReview}
            />
          ) : (
            <ul className='flex flex-col gap-3'>
              {visibleReviews.map(({ meta }) => {
                const style = getJobReviewTypeStyle(meta.jobReviewType)
                return (
                  <li key={meta.id}>
                    <Link
                      href={href(`/job-review/${meta.id}`)}
                      className='block rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_rgba(15,23,42,0.045)] ring-1 ring-black/[0.04] touch-manipulation transition hover:ring-[var(--brand)]/25 sm:p-5'
                    >
                      <div className='flex flex-wrap items-center gap-1.5'>
                        {meta.typeLabel ? (
                          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', style.badge)}>
                            {meta.typeLabel}
                          </span>
                        ) : null}
                        {meta.companyText && meta.companyText !== company.name ? (
                          <span className='rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]'>
                            {meta.companyText}
                          </span>
                        ) : null}
                      </div>
                      <h3 className='mt-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[16px]'>
                        {meta.title}
                      </h3>
                      <p className='mt-2 text-[12px] text-[var(--muted)]'>
                        {[meta.authorNickname, formatDate(meta.createdAt), companyCopy.viewCount(meta.viewCount)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </BoardPageShell>
  )
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className={className} aria-hidden>
      <path d='M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
    </svg>
  )
}
