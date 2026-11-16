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
import { JOB_REVIEW_TYPES } from '@lib/community/jobReview'
import { countryLabelKey } from '@lib/constants/company'
import { useFormat, useT } from '@lib/i18n/client'
import { EllieoBoardTag, EllieoFeedCard, EllieoPersonAvatar } from '@widgets/ellieo/EllieoFeedCard'
import { ChevronRightIcon } from '@widgets/ellieo/icons'
import { CompanyMark, IndustryTag } from '@widgets/nyc/CompanyBrand'
import { CompanyVisaInfo } from '@widgets/nyc/CompanyVisaInfo'
import { EmptyState } from '@widgets/nyc/EmptyState'
import { CompanyPostings } from '@widgets/nyc/PostingCard'

/**
 * Ellieo company page: logo-first profile card (logo, name, industry/country chips, careers buttons), then open
 * postings, visa info and interview reviews as feed cards — one 640px column. Same data as CompanyDetailScreen.
 */
export function EllieoCompanyDetailScreen({ slug }: { slug: string }) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const tRoot = useT()
  const format = useFormat()
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
    for (const review of reviews) {
      const id = review.meta.jobReviewType
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [reviews])
  const presentTypes = useMemo(() => JOB_REVIEW_TYPES.filter((item) => typeCounts.has(item.id)), [typeCounts])
  const visibleReviews = useMemo(
    () => (type === 'all' ? reviews : reviews.filter((review) => review.meta.jobReviewType === type)),
    [reviews, type],
  )

  if (loading) return <LoadingState fullPage label={t('list.loading')} />

  if (notFound || error || !detail) {
    return (
      <div className='mx-auto w-full max-w-[40rem] px-4 pt-6'>
        <EmptyState
          title={notFound ? t('detail.notFoundTitle') : t('list.loadError')}
          description={notFound ? t('detail.notFoundDescription') : error}
          actionHref={href('/companies')}
          actionLabel={t('detail.backToList')}
        />
      </div>
    )
  }

  const { company, parent, children } = detail

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-14 pt-4'>
        <Link href={href('/companies')} className='inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]'>
          ‹ {t('detail.backToList')}
        </Link>

        {/* Profile card */}
        <header className='mt-3 rounded-[1.75rem] bg-white p-5 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'>
          <div className='flex items-center gap-4'>
            <CompanyMark company={company} className='size-16 rounded-[1.125rem] text-[26px]' />
            <div className='min-w-0'>
              <h1 className='text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--foreground)]'>{company.name}</h1>
              <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                <IndustryTag label={company.industryLabel} industry={company.industry} />
                {company.country ? (
                  <span className='rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--muted-foreground)]'>
                    {t('detail.countryBadge', { country: countryName(company.country) })}
                  </span>
                ) : null}
                {parent ? (
                  <Link
                    href={href(`/companies/${parent.slug}`)}
                    className='rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--foreground)] hover:bg-[var(--border)]'
                  >
                    {t('detail.parentLabel')} {parent.name}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className='mt-4 grid gap-2 sm:grid-cols-2'>
            {company.studentsUrl ? (
              <a
                href={company.studentsUrl}
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => trackCompanyClick(company.slug, 'students')}
                className='inline-flex h-12 items-center justify-center rounded-full bg-[var(--brand)] px-5 text-[14.5px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
              >
                {t('detail.studentsButton')} ↗
              </a>
            ) : null}
            <a
              href={company.careersUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => trackCompanyClick(company.slug, 'careers')}
              className={cn(
                'inline-flex h-12 items-center justify-center rounded-full px-5 text-[14.5px] font-bold transition',
                company.studentsUrl
                  ? 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]'
                  : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] sm:col-span-2',
              )}
            >
              {t('detail.careersButton')} ↗
            </a>
          </div>
          <p className='mt-3 text-[12px] leading-relaxed text-[var(--muted)]'>{t('detail.careersNotice')}</p>

          {children.length ? (
            <div className='mt-4 border-t border-[var(--border)] pt-3'>
              <p className='text-[12px] font-bold text-[var(--muted)]'>{t('detail.subsidiariesLabel')}</p>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {children.map((child) => (
                  <Link
                    key={child.slug}
                    href={href(`/companies/${child.slug}`)}
                    className='inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] py-1 pl-1 pr-3 text-[12.5px] font-semibold text-[var(--foreground)] hover:bg-[var(--border)]'
                  >
                    <CompanyMark company={child} className='size-6 rounded-full text-[10px]' />
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <div className='mt-6 empty:hidden'>
          <CompanyPostings companySlug={company.slug} companyName={company.name} />
        </div>

        <div className='mt-6'>
          <CompanyVisaInfo visa={company.visa} />
        </div>

        {/* Reviews */}
        <section className='mt-8'>
          <div className='flex items-center gap-2'>
            <h2 className='text-[20px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>💼 {t('detail.reviewsTitle')}</h2>
            {!reviewsLoading ? (
              <span className='rounded-full bg-[var(--surface)] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[var(--muted-foreground)]'>
                {reviews.length}
              </span>
            ) : null}
            <span className='flex-1' />
            {children.length ? (
              <label className='inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[var(--muted-foreground)]'>
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
            <div className='-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {[{ id: 'all', label: t('detail.allTypes'), count: reviews.length }, ...presentTypes.map((item) => ({
                id: item.id,
                label: tRoot(`reviews.jobReview.types.${item.id}.label`),
                count: typeCounts.get(item.id) ?? 0,
              }))].map((chip) => (
                <button
                  key={chip.id}
                  type='button'
                  aria-pressed={type === chip.id}
                  onClick={() => setType(chip.id)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition',
                    type === chip.id ? 'bg-[var(--foreground)] text-white' : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
                  )}
                >
                  {chip.label}
                  <span className='text-[12px] opacity-70'>{chip.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className='mt-3'>
            {reviewsLoading ? (
              <LoadingState />
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
                {visibleReviews.map(({ meta }) => {
                  const name = meta.authorNickname || company.name
                  const typeLabel = meta.jobReviewType
                    ? tRoot(`reviews.jobReview.types.${meta.jobReviewType}.label`)
                    : meta.typeLabel
                  return (
                    <li key={meta.id}>
                      <EllieoFeedCard
                        href={`${href(`/job-review/${meta.id}`)}?${new URLSearchParams({ company: company.slug, companyName: company.name })}`}
                        avatar={<EllieoPersonAvatar name={name} />}
                        name={name}
                        meta={format.relative(meta.createdAt)}
                        tag={typeLabel ? <EllieoBoardTag emoji='💼' label={typeLabel} /> : null}
                        title={meta.title}
                        likes={meta.recommendCount}
                        comments={meta.commentCount}
                        views={meta.viewCount}
                        action={<ChevronRightIcon className='size-5 text-[var(--muted)]' />}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
