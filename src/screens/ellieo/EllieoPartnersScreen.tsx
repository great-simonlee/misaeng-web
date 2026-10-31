'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { useFormat, useT } from '@lib/i18n/client'
import { ArrowRightIcon, MailIcon } from '@widgets/ellieo/icons'
import {
  ELLIEO_CREATORS,
  ELLIEO_PARTNER_ORGS,
  getCreators,
  getPartnerOrgs,
  isMockList,
  type EllieoCreator,
} from '@widgets/ellieo/mockContent'

const PARTNER_EMAIL = 'info@ellieo.com'

const PLATFORM_URL: Record<EllieoCreator['platform'], (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
}

type Row = {
  id: string
  mark: string
  color: string
  name: string
  detail: string
  url: string | null
}

/**
 * Ellieo partners page: partner Vietnamese Student Associations and creators (same data as the home
 * stories strip, widgets/ellieo/mockContent), plus how to become a partner. Misaeng keeps PartnerSchoolsScreen.
 */
export function EllieoPartnersScreen() {
  const t = useT('hub')
  const format = useFormat()
  const href = useCityPath()
  const orgs = getPartnerOrgs()
  const creators = getCreators()

  const orgRows: Row[] = orgs.map((org) => ({
    id: org.id,
    mark: org.mark,
    color: org.color,
    name: org.name,
    detail: org.school,
    url: org.instagram ? `https://instagram.com/${org.instagram}` : null,
  }))
  const creatorRows: Row[] = creators.map((creator) => ({
    id: creator.id,
    mark: creator.name.charAt(0),
    color: creator.color,
    name: creator.name,
    detail: `${t(`ellieo.creators.platforms.${creator.platform}`)} · ${format.number(
      creator.followers,
      {
        notation: 'compact',
        maximumFractionDigits: 1,
      }
    )}`,
    url: creator.handle ? PLATFORM_URL[creator.platform](creator.handle) : null,
  }))

  return (
    // Same frame as the boards: aligned with the header, content in a 48rem column
    <div className='mx-auto w-full max-w-7xl flex-1 px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:px-8'>
      <div className='max-w-3xl'>
        <h1 className='text-[1.75rem] font-extrabold tracking-[-0.03em] text-[var(--foreground)] sm:text-[2rem]'>
          {t('ellieo.partnersPage.title')}
        </h1>
        <p className='mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]'>
          {t('ellieo.partnersPage.body')}
        </p>

        <PartnerList
          title={t('ellieo.partnersPage.vsas')}
          rows={orgRows}
          sample={isMockList(orgs, ELLIEO_PARTNER_ORGS)}
          empty={t('ellieo.partnersPage.emptyVsas')}
        />
        <PartnerList
          title={t('ellieo.partnersPage.creators')}
          rows={creatorRows}
          sample={isMockList(creators, ELLIEO_CREATORS)}
          empty={t('ellieo.partnersPage.emptyCreators')}
        />

        {/* Become a partner */}
        <section className='mt-10 rounded-2xl border border-[var(--border)] bg-[#f8f9fc] px-5 py-6 sm:px-7'>
          <h2 className='text-[16px] font-bold text-[var(--foreground)]'>
            {t('ellieo.partnersPage.joinTitle')}
          </h2>
          <p className='mt-1 text-[14px] leading-relaxed text-[var(--muted)]'>
            {t('ellieo.partnersPage.joinBody')}
          </p>
          <a
            href={`mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent('Ellieo partnership')}`}
            className='mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--navy-light)]'
          >
            <MailIcon className='size-4' />
            {PARTNER_EMAIL}
          </a>
        </section>

        <Link
          href={href()}
          className='mt-8 inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--brand)]'
        >
          {t('ellieo.partnersPage.back')}
          <ArrowRightIcon className='size-4' />
        </Link>
      </div>
    </div>
  )
}

function PartnerList({
  title,
  rows,
  sample,
  empty,
}: {
  title: string
  rows: Row[]
  sample: boolean
  empty: string
}) {
  const t = useT('hub')
  return (
    <section className='mt-9'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-[1.15rem] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>
          {title}
        </h2>
        {sample ? (
          <span className='rounded-full bg-[var(--ellieo-sun-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[#9a6200]'>
            {t('ellieo.sampleData')}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className='mt-3 text-[14px] text-[var(--muted)]'>{empty}</p>
      ) : (
        <ul className='mt-2 divide-y divide-[var(--border)]'>
          {rows.map((row) => {
            const inner = (
              <>
                <span
                  aria-hidden
                  className='flex size-11 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white'
                  style={{ background: row.color }}
                >
                  {row.mark}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-[15px] font-semibold text-[var(--foreground)]'>
                    {row.name}
                  </span>
                  <span className='block truncate text-[13px] text-[var(--muted)]'>
                    {row.detail}
                  </span>
                </span>
                {row.url ? (
                  <ArrowRightIcon className='size-4 shrink-0 text-[var(--muted)]' />
                ) : null}
              </>
            )
            return (
              <li key={row.id}>
                {row.url ? (
                  <a
                    href={row.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 py-3 transition hover:opacity-80'
                  >
                    {inner}
                  </a>
                ) : (
                  <div className='flex items-center gap-3 py-3'>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
