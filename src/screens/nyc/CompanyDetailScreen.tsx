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
import { countryLabelKey } from '@lib/constants/company'
import { useFormat, useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { ChipScrollRow } from '@widgets/nyc/ChipScrollRow'
import { CompanyHeroPanel, CompanyMark, IndustryTag } from '@widgets/nyc/CompanyBrand'
import { CompanyVisaInfo } from '@widgets/nyc/CompanyVisaInfo'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { CompanyPostings } from '@widgets/nyc/PostingCard'

const PRIMARY_LINK =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgb(var(--brand-rgb)/0.7)] touch-manipulation transition hover:bg-[var(--brand-hover)] active:scale-[0.98]'
const SECONDARY_LINK =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-5 text-[14px] font-semibold text-white ring-1 ring-white/15 backdrop-blur touch-manipulation transition hover:bg-white/[0.14] active:scale-[0.98]'
const HERO_PILL =
  'inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-2 py-[3px] text-[11px] font-semibold leading-none text-white/70 ring-1 ring-white/10'


export function CompanyDetailScreen({ slug }: { slug: string }) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const tRoot = useT()
  const format = useFormat()
  const formatDate = (ms: number) =>
    Number.isFinite(ms) && ms > 0
      ? format.date(ms, { year: '2-digit', month: 'short', day: 'numeric' })
      : ''
  /** 문구가 없는 국가 코드는 코드 그대로 */
  const countryName = (code: string) => {
    const key = countryLabelKey(code)
    const label = t(key)
    return label.endsWith(key) ? code : label
  }
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
      else setError(e instanceof Error && e.message ? e.message : t('common.requestFailed'))
    } finally {
      setLoading(false)
    }
  }, [slug, city, t])

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    setReviewsError('')
    try {
      setReviews(await fetchCompanyReviews(slug, city, { includeSubsidiaries }))
    } catch (e) {
      setReviewsError(e instanceof Error && e.message ? e.message : t('common.requestFailed'))
    } finally {
      setReviewsLoading(false)
    }
  }, [slug, city, includeSubsidiaries, t])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of reviews) {
      const id = r.meta.jobReviewType
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [reviews])

  const presentTypes = useMemo(
    () => JOB_REVIEW_TYPES.filter((item) => typeCounts.has(item.id)),
    [typeCounts]
  )

  const visibleReviews = useMemo(
    () => (type === 'all' ? reviews : reviews.filter((r) => r.meta.jobReviewType === type)),
    [reviews, type]
  )

  if (loading) {
    return (
      <BoardPageShell width='wide'>
        <div className='py-24'>
          <LoadingState label={t('list.loading')} />
        </div>
      </BoardPageShell>
    )
  }

  if (notFound || error || !detail) {
    return (
      <BoardPageShell width='wide'>
        <div className='pt-8'>
          <EmptyState
            title={notFound ? t('detail.notFoundTitle') : t('list.loadError')}
            description={notFound ? t('detail.notFoundDescription') : error}
            actionHref={href('/companies')}
            actionLabel={t('detail.backToList')}
          />
        </div>
      </BoardPageShell>
    )
  }

  const { company, parent, children } = detail

  return (
    <BoardPageShell width='wide'>
      <header className='pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href('/companies')}
          className='flex w-fit items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> {t('detail.backToList')}
        </Link>

        <CompanyHeroPanel className='mt-3'>
          <div className='flex flex-col gap-5 md:flex-row md:items-center md:justify-between'>
            <div className='flex min-w-0 items-center gap-4 sm:gap-5'>
              <CompanyMark
                company={company}
                className='size-16 rounded-2xl text-[26px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] sm:size-[76px] sm:text-[30px]'
              />
              <div className='min-w-0'>
                <h1 className='truncate text-[1.5rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[1.9rem]'>
                  {company.name}
                </h1>
                <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                  <IndustryTag
                    label={company.industryLabel}
                    industry={company.industry}
                    tone='dark'
                  />
                  {company.country ? (
                    <span className={HERO_PILL}>
                      {t('detail.countryBadge', { country: countryName(company.country) })}
                    </span>
                  ) : null}
                  {parent ? (
                    <Link
                      href={href(`/companies/${parent.slug}`)}
                      className={cn(HERO_PILL, 'transition hover:bg-white/[0.14] hover:text-white')}
                    >
                      <span className='text-white/45'>{t('detail.parentLabel')}</span>
                      {parent.name}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 학생·인턴·신입 페이지가 있으면 그게 메인 버튼, 공식 채용 페이지는 보조 */}
            <div className='flex shrink-0 flex-col gap-2 sm:flex-row'>
              {company.studentsUrl ? (
                <a
                  href={company.studentsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={() => trackCompanyClick(company.slug, 'students')}
                  className={PRIMARY_LINK}
                >
                  {t('detail.studentsButton')}
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
                {t('detail.careersButton')}
                <ExternalIcon className='size-4' />
              </a>
            </div>
          </div>

          <p className='mt-5 text-[12px] leading-relaxed text-white/45'>
            {t('detail.careersNotice')}
          </p>

          {children.length ? (
            <div className='mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4'>
              <span className='mr-1 text-[12px] font-medium text-white/45'>
                {t('detail.subsidiariesLabel')}
              </span>
              {children.map((child) => (
                <Link
                  key={child.slug}
                  href={href(`/companies/${child.slug}`)}
                  className='inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 ring-1 ring-white/10 transition hover:bg-white/[0.12]'
                >
                  <CompanyMark company={child} className='size-6 rounded-full text-[10px]' />
                  <span className='text-[12px] font-medium text-white/80'>{child.name}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </CompanyHeroPanel>
      </header>

      {/* 모바일 순서: 공고 → 비자 정보 → 후기. 넓은 화면: 왼쪽 공고·후기, 오른쪽 비자 정보 */}
      <div className='mt-8 grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10'>
        <div className='min-w-0 empty:hidden lg:col-start-1'>
          <CompanyPostings companySlug={company.slug} companyName={company.name} />
        </div>

        <aside className='lg:col-start-2 lg:row-span-2 lg:row-start-1'>
          <div className='lg:sticky lg:top-24'>
            <CompanyVisaInfo visa={company.visa} />
          </div>
        </aside>

        <section className='min-w-0 lg:col-start-1'>
          <div className='flex items-center gap-3'>
            <h2 className='flex items-baseline gap-2 text-[17px] font-bold tracking-tight text-[var(--foreground)] sm:text-[19px]'>
              {t('detail.reviewsTitle')}
              {!reviewsLoading ? (
                <span className='text-[14px] font-semibold tabular-nums text-[var(--muted)]'>
                  {reviews.length}
                </span>
              ) : null}
            </h2>
            <span
              aria-hidden
              className='h-px flex-1 bg-gradient-to-r from-black/10 to-transparent'
            />
            {children.length ? (
              <label className='inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[var(--muted)] sm:text-[13px]'>
                <input
                  type='checkbox'
                  checked={includeSubsidiaries}
                  onChange={(e) => setIncludeSubsidiaries(e.target.checked)}
                  className='accent-[var(--brand)]'
                />
                {t('detail.includeSubsidiaries')}
              </label>
            ) : null}
          </div>

          {presentTypes.length > 1 ? (
            <ChipScrollRow
              className='mt-4'
              leading={
                <TypeChip
                  label={t('detail.allTypes')}
                  count={reviews.length}
                  active={type === 'all'}
                  onClick={() => setType('all')}
                />
              }
            >
              {presentTypes.map((item) => (
                <TypeChip
                  key={item.id}
                  label={tRoot(`reviews.jobReview.types.${item.id}.label`)}
                  count={typeCounts.get(item.id) ?? 0}
                  active={type === item.id}
                  onClick={() => setType(item.id)}
                />
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
                title={t('detail.reviewsError')}
                description={reviewsError}
                onAction={() => void loadReviews()}
                actionLabel={t('common.retry')}
              />
            ) : visibleReviews.length === 0 ? (
              <EmptyState
                title={t('detail.reviewsEmpty')}
                description={company.name}
                actionHref={href('/job-review/new')}
                actionLabel={t('detail.writeReview')}
              />
            ) : (
              <ul className='flex flex-col gap-3'>
                {visibleReviews.map(({ meta }, i) => {
                  const style = getJobReviewTypeStyle(meta.jobReviewType)
                  return (
                    <li
                      key={meta.id}
                      className='motion-safe:animate-[sheetUp_480ms_cubic-bezier(0.22,1,0.36,1)_both]'
                      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    >
                      <Link
                        href={`${href(`/job-review/${meta.id}`)}?${new URLSearchParams({ company: company.slug, companyName: company.name })}`}
                        className='group flex items-center gap-4 rounded-[1.25rem] bg-white p-4 ring-1 ring-black/[0.06] touch-manipulation transition duration-200 hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.16)] hover:ring-black/[0.12] active:scale-[0.995] sm:p-5'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            {meta.jobReviewType || meta.typeLabel ? (
                              <span
                                className={cn(
                                  'rounded-md px-2 py-[3px] text-[11px] font-semibold leading-none ring-1',
                                  style.badge
                                )}
                              >
                                {meta.jobReviewType
                                  ? tRoot(`reviews.jobReview.types.${meta.jobReviewType}.label`)
                                  : meta.typeLabel}
                              </span>
                            ) : null}
                            {meta.companyText && meta.companyText !== company.name ? (
                              <span className='rounded-md bg-white px-2 py-[3px] text-[11px] font-semibold leading-none text-[var(--muted-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.07]'>
                                {meta.companyText}
                              </span>
                            ) : null}
                          </div>
                          <h3 className='mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[16px]'>
                            {meta.title}
                          </h3>
                          <p className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]'>
                            {meta.authorNickname ? (
                              <span className='inline-flex items-center gap-1.5 font-medium text-[var(--muted-foreground)]'>
                                <span
                                  aria-hidden
                                  className='inline-flex size-5 items-center justify-center rounded-full bg-[var(--brand-light)] text-[10px] font-bold text-[var(--brand)]'
                                >
                                  {Array.from(meta.authorNickname)[0]?.toUpperCase()}
                                </span>
                                {meta.authorNickname}
                              </span>
                            ) : null}
                            {formatDate(meta.createdAt) ? (
                              <span>{formatDate(meta.createdAt)}</span>
                            ) : null}
                            <span className='inline-flex items-center gap-1'>
                              <EyeIcon className='size-3.5' />
                              {meta.viewCount}
                            </span>
                          </p>
                        </div>
                        <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[var(--muted)] transition group-hover:bg-[var(--foreground)] group-hover:text-white'>
                          <ArrowIcon className='size-3.5' />
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </BoardPageShell>
  )
}

function TypeChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
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

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  )
}
