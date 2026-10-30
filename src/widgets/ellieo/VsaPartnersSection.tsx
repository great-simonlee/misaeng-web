'use client'

import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'

/**
 * Partner Vietnamese Student Associations (brief §3: structure only, hidden by default).
 * Turn on with BRAND_CONFIG.sections.vsaPartners and fill VSA_PARTNERS once partnerships exist
 * (later: managed from the ERP instead of this list).
 */
export type VsaPartner = { id: string; name: string; school: string; instagram?: string }

export const VSA_PARTNERS: readonly VsaPartner[] = []

export function VsaPartnersSection() {
  const t = useT('hub')
  if (!BRAND_CONFIG.sections.vsaPartners || VSA_PARTNERS.length === 0) return null

  return (
    <section className='mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8'>
      <h2 className='text-[1.3rem] font-bold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.5rem]'>
        {t('ellieo.vsa.title')}
      </h2>
      <p className='mt-1 max-w-2xl text-[14.5px] leading-relaxed text-[var(--muted)]'>{t('ellieo.vsa.body')}</p>
      <ul className='mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4'>
        {VSA_PARTNERS.map((partner) => (
          <li key={partner.id} className='rounded-xl bg-white p-4 ring-1 ring-[var(--border)]'>
            <p className='text-[15px] font-semibold text-[var(--foreground)]'>{partner.name}</p>
            <p className='text-[13px] text-[var(--muted)]'>{partner.school}</p>
            {partner.instagram ? (
              <a
                href={`https://instagram.com/${partner.instagram}`}
                target='_blank'
                rel='noopener noreferrer'
                className='mt-2 inline-block text-[13px] font-medium text-[var(--brand)]'
              >
                @{partner.instagram}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
