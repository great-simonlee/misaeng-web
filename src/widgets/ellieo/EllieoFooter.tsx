'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { useSupportConfig } from '@lib/support/client'
import { EllieoMark } from '@widgets/ellieo/EllieoNavbar'
import {
  BadgeCheckIcon,
  FlagIcon,
  MailIcon,
  NoCashIcon,
  ShieldCheckIcon,
} from '@widgets/ellieo/icons'

/** Ellieo's own contact address (legal notices in the Terms/Privacy Policy still name Misaeng LLC's address) */
const CONTACT_EMAIL = 'info@ellieo.com'

/**
 * Ellieo footer. Trust-first (brief §3): the three safety promises in a navy card on top,
 * compact link columns, then one small line with the operator ("Operated by Misaeng LLC, New York"),
 * license/brokerage, trademark and copyright.
 * License and brokerage come from BRAND_CONFIG.trust and stay hidden until filled in.
 */
export function EllieoFooter() {
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('nav')
  const trust = BRAND_CONFIG.trust
  const pathname = usePathname()
  const isHome = pathname === href()
  const sla = trust.reportSlaHours
  const supportConfig = useSupportConfig()

  const trustItems = [
    {
      icon: BadgeCheckIcon,
      title: t('ellieo.trust.verifiedTitle'),
      body: t('ellieo.trust.verifiedBody'),
    },
    {
      icon: NoCashIcon,
      title: t('ellieo.trust.noDepositTitle'),
      body: t('ellieo.trust.noDepositBody'),
    },
    ...(sla
      ? [
          {
            icon: FlagIcon,
            title: t('ellieo.trust.reportTitle', { hours: sla }),
            body: t('ellieo.trust.reportBody'),
          },
        ]
      : []),
  ]

  const support = [
    { href: href('/about'), label: t('footer.links.about') },
    { href: href('/me'), label: t('footer.links.me') },
    // Help: the inquiry board (login required; the page sends guests to log in first)
    ...(supportConfig?.inquiries ? [{ href: href('/me/inquiries'), label: t('footer.links.inquiries') }] : []),
    { href: `mailto:${CONTACT_EMAIL}`, label: t('footer.links.contact') },
  ]
  const legal = [
    { href: href('/terms-of-use'), label: t('footer.links.terms') },
    { href: href('/privacy-policy'), label: t('footer.links.privacy') },
  ]

  // Bottom line: operator, license/brokerage (hidden until filled in), trademark, copyright, joined on one line
  const legalLine = [
    trust.operator
      ? t('ellieo.operatedBy', { company: trust.operator.name, city: trust.operator.city })
      : null,
    trust.realEstateLicense ? t('ellieo.license', { number: trust.realEstateLicense }) : null,
    trust.brokerage ? t('ellieo.brokerage', { name: trust.brokerage }) : null,
    trust.trademarkRegNo
      ? t('ellieo.trademark', { brand: BRAND_CONFIG.name, number: trust.trademarkRegNo })
      : null,
    '© 2026 Misaeng LLC',
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/\.$/, ''))

  const links = [...support, ...legal]

  return (
    <footer className='mt-auto bg-white pb-6 pt-8 text-[var(--foreground)]'>
      <div className='mx-auto w-full max-w-[40rem] px-4'>
        {/* Trust: three promises as small cards, home only */}
        {isHome ? (
          <section aria-label={t('ellieo.trust.headline')} className='mb-8 rounded-[1.5rem] bg-[var(--brand-soft)] p-5'>
            <div className='flex items-center gap-2'>
              <ShieldCheckIcon className='size-5 text-[var(--brand)]' />
              <h2 className='text-[17px] font-extrabold tracking-[-0.02em]'>{t('ellieo.trust.headline')}</h2>
            </div>
            <p className='mt-1 text-[13.5px] leading-snug text-[var(--muted-foreground)]'>
              {t('ellieo.trust.subline', {
                company: trust.operator?.name ?? 'Misaeng LLC',
                city: trust.operator?.city ?? 'New York',
              })}
            </p>
            <ul className='mt-4 grid gap-2'>
              {trustItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title} className='flex gap-3 rounded-[1.125rem] bg-white p-3.5'>
                    <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ellieo-lime)] text-[var(--foreground)]'>
                      <Icon className='size-[18px]' />
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-[14px] font-bold'>{item.title}</span>
                      <span className='mt-0.5 block text-[13px] leading-snug text-[var(--muted-foreground)]'>{item.body}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <div className='flex items-center gap-2'>
          <Link href={href()} className='inline-flex items-center gap-1.5' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
            <EllieoMark size={22} />
            <span className='text-[16px] font-extrabold tracking-[-0.04em]'>ellieo</span>
          </Link>
        </div>
        <nav aria-label={t('ellieo.legalGroup')} className='mt-3'>
          <ul className='flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-medium text-[var(--muted-foreground)]'>
            {links.map((item) => (
              <li key={item.href}>
                {/^(https?:|mailto:)/.test(item.href) ? (
                  <a href={item.href} className='transition hover:text-[var(--foreground)]'>
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className='transition hover:text-[var(--foreground)]'>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className='mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand)]'
        >
          <MailIcon className='size-4' />
          {CONTACT_EMAIL}
        </a>
        <p className='mt-3 text-[12px] leading-relaxed text-[var(--muted)]'>{legalLine.join(' · ')}</p>
      </div>
    </footer>
  )
}
