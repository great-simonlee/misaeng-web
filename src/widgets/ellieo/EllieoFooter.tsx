'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG, brandConfig } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { BadgeCheckIcon, FlagIcon, MailIcon, NoCashIcon } from '@widgets/ellieo/icons'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

const CONTACT_EMAIL = 'info@misaeng.com'

/** Misaeng LLC company pages (Ellieo has no corporate site of its own) */
function misaengHref(path: string) {
  return `${brandConfig('misaeng').productionUrl}${path}`
}

/**
 * Ellieo footer. Light, trust-first (brief §3): what makes the community safe sits on top,
 * the operator line ("Operated by Misaeng LLC, New York") and license/brokerage lines at the bottom.
 * License and brokerage come from BRAND_CONFIG.trust and stay hidden until filled in.
 */
export function EllieoFooter() {
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('nav')
  const tc = useT('community')
  const trust = BRAND_CONFIG.trust
  const sla = trust.reportSlaHours

  const trustItems = [
    { icon: BadgeCheckIcon, title: t('ellieo.trust.verifiedTitle'), body: t('ellieo.trust.verifiedBody') },
    { icon: NoCashIcon, title: t('ellieo.trust.noDepositTitle'), body: t('ellieo.trust.noDepositBody') },
    ...(sla
      ? [{ icon: FlagIcon, title: t('ellieo.trust.reportTitle'), body: t('ellieo.trust.reportBody', { hours: sla }) }]
      : []),
  ]

  const boards = ELLIEO_BOARDS.filter((board) => board.available).map((board) => ({
    href: href(board.path),
    label: tc(`categories.${board.id}.title`),
  }))
  const support = [
    { href: href('/me'), label: t('footer.links.me') },
    { href: misaengHref('/contact'), label: t('footer.links.contact') },
  ]
  const legal = [
    { href: href('/terms-of-use'), label: t('footer.links.terms') },
    { href: href('/privacy-policy'), label: t('footer.links.privacy') },
  ]

  return (
    <footer className='mt-auto border-t border-[var(--border)] bg-white text-[var(--foreground)]'>
      {/* Trust strip */}
      <div className='border-b border-[var(--border)] bg-[var(--background)]'>
        <ul className='mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3 sm:gap-6 sm:px-6 lg:px-8'>
          {trustItems.map(({ icon: Icon, title, body }) => (
            <li key={title} className='flex min-w-0 gap-3'>
              <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ellieo-jade-soft)] text-[var(--ellieo-jade)]'>
                <Icon className='size-5' />
              </span>
              <span className='min-w-0'>
                <span className='block text-[14px] font-semibold'>{title}</span>
                <span className='block text-[13px] leading-relaxed text-[var(--muted)]'>{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className='mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]'>
          <div className='col-span-2 min-w-0 md:col-span-1'>
            <Link href={href()} className='inline-flex items-center' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
              <Image
                src={BRAND_CONFIG.assets.banner.src}
                alt={BRAND_CONFIG.name}
                width={BRAND_CONFIG.assets.banner.width}
                height={BRAND_CONFIG.assets.banner.height}
                className='h-6 w-auto'
              />
              {trust.registeredMark ? (
                <sup className='ml-0.5 self-start text-[9px] font-semibold text-[var(--muted)]'>®</sup>
              ) : null}
            </Link>
            <p className='mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--muted)]'>{t('ellieo.footerTagline')}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className='mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)]'
            >
              <MailIcon className='size-4' />
              {CONTACT_EMAIL}
            </a>
          </div>
          <LinkColumn title={t('footer.groups.community')} links={boards} />
          <LinkColumn title={t('footer.groups.support')} links={support} />
          <LinkColumn title={t('ellieo.legalGroup')} links={legal} />
        </div>

        <div className='mt-8 space-y-1.5 border-t border-[var(--border)] pt-5 text-[12.5px] leading-relaxed text-[var(--muted)]'>
          {trust.operator ? (
            <p className='font-medium text-[var(--muted-foreground)]'>
              {t('ellieo.operatedBy', { company: trust.operator.name, city: trust.operator.city })}
            </p>
          ) : null}
          {trust.realEstateLicense ? (
            <p>{t('ellieo.license', { number: trust.realEstateLicense })}</p>
          ) : null}
          {trust.brokerage ? <p>{t('ellieo.brokerage', { name: trust.brokerage })}</p> : null}
          {trust.trademarkRegNo ? (
            <p>{t('ellieo.trademark', { brand: BRAND_CONFIG.name, number: trust.trademarkRegNo })}</p>
          ) : null}
          <p>© 2026 Misaeng LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className='min-w-0'>
      <p className='text-[13px] font-semibold text-[var(--foreground)]'>{title}</p>
      <ul className='mt-3 space-y-2'>
        {links.map((item) => (
          <li key={item.href}>
            {item.href.startsWith('http') ? (
              <a href={item.href} className='text-[14px] text-[var(--muted)] transition hover:text-[var(--foreground)]'>
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className='text-[14px] text-[var(--muted)] transition hover:text-[var(--foreground)]'>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
