'use client'

import { useT } from '@lib/i18n/client'
import type { HousingListing } from '@/types/nyc'

/** NY DOS Fair Housing Notice + Housing & Anti-Discrimination Disclosure (brokers must show them; ERP can change). */
export const FAIR_HOUSING_NOTICE_URL = 'https://dos.ny.gov/system/files/documents/2024/03/fair-housing-notice.pdf'
export const HOUSING_DISCLOSURE_URL =
  'https://dos.ny.gov/system/files/documents/2024/03/nys-housing-and-anti-discrimination-disclosure-form.pdf'

/**
 * "Listed by" block on a housing listing (NY 19 NYCRR 175.25 advertising disclosure, owner 11-26): brokerage, agent
 * name, license type words, contact, tenant fee (NYC FARE Act) and the Fair Housing links. Misaeng's own listings get
 * the brokerage from settings on the server (src/lib/agents/brokerage.server.ts); licensed agents' listings carry their
 * approved license.
 */
export function HousingListedBy({ listing, className }: { listing: HousingListing; className?: string }) {
  const t = useT('housing')
  const by = listing.listedBy
  if (!by?.brokerage) return null
  const fee = listing.tenantFees?.brokerFee ?? 0
  return (
    <section className={className} aria-label={t('listedBy.title')}>
      <div className='rounded-2xl border border-black/[0.06] bg-[#fafbfc] px-4 py-3 text-sm'>
        <p className='text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]'>{t('listedBy.title')}</p>
        <p className='mt-1 font-semibold text-[var(--foreground)]'>
          {by.brokerage}
          {by.source === 'agent' ? (
            <span className='ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'>
              {t('listedBy.licensedAgent')}
            </span>
          ) : null}
        </p>
        {by.agentName ? (
          <p className='mt-0.5 text-[var(--foreground)]'>
            {by.agentName}
            {by.licenseLabel ? <span className='text-[var(--muted-foreground)]'> · {by.licenseLabel}</span> : null}
          </p>
        ) : null}
        {by.phone || by.email ? (
          <p className='mt-0.5 text-[var(--muted-foreground)]'>
            {[by.phone, by.email].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {by.officeAddress ? <p className='mt-0.5 text-xs text-[var(--muted-foreground)]'>{by.officeAddress}</p> : null}
        <p className='mt-2 text-[var(--foreground)]'>
          {fee > 0 ? t('listedBy.brokerFee', { amount: `$${fee.toLocaleString('en-US')}` }) : t('listedBy.noFee')}
        </p>
        <p className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
          <a className='underline' href={FAIR_HOUSING_NOTICE_URL} target='_blank' rel='noreferrer'>
            {t('listedBy.fairHousing')}
          </a>
          <a className='underline' href={HOUSING_DISCLOSURE_URL} target='_blank' rel='noreferrer'>
            {t('listedBy.disclosure')}
          </a>
        </p>
      </div>
    </section>
  )
}
