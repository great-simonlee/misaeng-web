'use client'

import { LanguageMenu } from '@widgets/LanguageMenu'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { useSupportConfig } from '@lib/support/client'
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
    { href: href('/credit'), label: t('ellieo.menu.points') },
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
        {/* Trust: compact list, phones/tablets on Home (desktop has it in the right column) */}
        {isHome ? (
          <section aria-label={t('ellieo.trust.headline')} className='mb-6 border-y border-[var(--border)] py-3 lg:hidden'>
            <h2 className='flex items-center gap-1.5 text-[13px] font-semibold text-[var(--foreground)]'>
              <ShieldCheckIcon className='size-4 text-[var(--brand)]' />
              {t('ellieo.trust.headline')}
            </h2>
            <ul className='mt-2 space-y-1.5'>
              {trustItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title} className='flex items-center gap-2 text-[12.5px] text-[var(--muted-foreground)]'>
                    <Icon className='size-3.5 shrink-0 text-[var(--brand)]' />
                    {item.title}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <div className='flex items-center gap-2'>
          <Link href={href()} className='inline-flex items-center gap-1.5' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
            <Image
              src={BRAND_CONFIG.assets.banner.src}
              alt={BRAND_CONFIG.name}
              width={BRAND_CONFIG.assets.banner.width}
              height={BRAND_CONFIG.assets.banner.height}
              className='h-5 w-auto'
            />
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
        <div className='mt-4 flex items-center gap-3 sm:hidden'>
          <span className='text-[13px] font-semibold text-[var(--muted-foreground)]'>{t('ellieo.language')}</span>
          <LanguageMenu variant='segmented' />
        </div>
        <p className='mt-3 text-[12px] leading-relaxed text-[var(--muted)]'>{legalLine.join(' · ')}</p>
      </div>
    </footer>
  )
}
