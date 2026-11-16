'use client'

import { useCityInfo } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { BadgeCheckIcon, FlagIcon, NoCashIcon, PinIcon, ShieldCheckIcon } from '@widgets/ellieo/icons'

/** Desktop right column (docs/design/ellieo-community.md): the city you're browsing */
export function EllieoCityCard() {
  const t = useT('nav')
  const cityInfo = useCityInfo()
  return (
    <section className='rounded-2xl border border-[var(--border)] bg-white p-4'>
      <p className='flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted)]'>
        <PinIcon className='size-4' />
        {t('ellieo.cityCardTitle')}
      </p>
      <p className='mt-1 text-[17px] font-bold text-[var(--foreground)]'>{cityInfo.name}</p>
      <p className='mt-0.5 text-[13px] leading-snug text-[var(--muted-foreground)]'>
        {t('ellieo.cityCardBody', { city: cityInfo.name, regions: cityInfo.regions })}
      </p>
    </section>
  )
}

/** Desktop right column: the three safety commitments, compact */
export function EllieoSafetyCard() {
  const t = useT('nav')
  const trust = BRAND_CONFIG.trust
  const sla = trust.reportSlaHours
  const items = [
    { icon: BadgeCheckIcon, title: t('ellieo.trust.verifiedTitle') },
    { icon: NoCashIcon, title: t('ellieo.trust.noDepositTitle') },
    ...(sla ? [{ icon: FlagIcon, title: t('ellieo.trust.reportTitle', { hours: sla }) }] : []),
  ]
  return (
    <section className='rounded-2xl border border-[var(--border)] bg-white p-4'>
      <h2 className='flex items-center gap-1.5 text-[14px] font-semibold text-[var(--foreground)]'>
        <ShieldCheckIcon className='size-4 text-[var(--brand)]' />
        {t('ellieo.trust.headline')}
      </h2>
      <ul className='mt-2.5 space-y-2'>
        {items.map((item) => (
          <li key={item.title} className='flex items-start gap-2 text-[13px] leading-snug text-[var(--muted-foreground)]'>
            <item.icon className='mt-0.5 size-4 shrink-0 text-[var(--brand)]' />
            {item.title}
          </li>
        ))}
      </ul>
    </section>
  )
}
