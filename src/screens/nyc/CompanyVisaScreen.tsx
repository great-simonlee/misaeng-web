'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import {
  fetchCompany,
  fetchVisaSponsors,
  type CompanyDetail,
  type VisaSponsorData,
} from '@lib/company/client'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CompanyVisaInfo } from '@widgets/nyc/CompanyVisaInfo'
import { VisaSponsorEntry, VisaSponsorView } from '@widgets/nyc/CompanyVisaSponsor'
import { EmptyState } from '@widgets/nyc/EmptyState'

/** /companies/{slug}/visa — the company's visa facts and DOL filing history (Premium). */
export function CompanyVisaScreen({ slug }: { slug: string }) {
  const city = useCity()
  const href = useCityPath()
  const t = useT('companies')
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [sponsor, setSponsor] = useState<VisaSponsorData | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let alive = true
    void Promise.all([fetchCompany(slug, city).catch(() => null), fetchVisaSponsors(slug)]).then(([c, s]) => {
      if (!alive) return
      setDetail(c)
      setSponsor(s)
      setState(c ? 'ready' : 'missing')
    })
    return () => {
      alive = false
    }
  }, [slug, city])

  if (state === 'loading') {
    return (
      <BoardPageShell width='wide'>
        <div className='py-24'>
          <LoadingState label={t('list.loading')} />
        </div>
      </BoardPageShell>
    )
  }
  if (state === 'missing' || !detail) {
    return (
      <BoardPageShell width='wide'>
        <div className='pt-8'>
          <EmptyState
            title={t('detail.notFoundTitle')}
            description={t('detail.notFoundDescription')}
            actionHref={href('/companies')}
            actionLabel={t('detail.backToList')}
          />
        </div>
      </BoardPageShell>
    )
  }

  const { company } = detail
  const locked = company.visaLocked ?? sponsor?.locked ?? true
  return (
    <BoardPageShell width='wide'>
      <div className='mx-auto max-w-[860px] pb-20 pt-4 sm:pt-5 lg:pt-6'>
        <Link
          href={href(`/companies/${slug}`)}
          className='flex w-fit items-center gap-1 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:text-[13px]'
        >
          <span aria-hidden>‹</span> {t('sponsor.back')}
        </Link>
        <h1 className='mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] sm:text-[1.9rem]'>
          {company.name} · {t('sponsor.title')}
        </h1>

        <div className='mt-6 flex flex-col gap-8'>
          {locked ? (
            // Free members (or a direct link): the same summary row + Premium sheet as the company page
            <VisaSponsorEntry slug={slug} sponsor={sponsor} locked />
          ) : (
            <>
              {company.visa ? <CompanyVisaInfo visa={company.visa} /> : null}
              {sponsor ? <VisaSponsorView sponsor={sponsor} /> : null}
            </>
          )}
        </div>
      </div>
    </BoardPageShell>
  )
}
