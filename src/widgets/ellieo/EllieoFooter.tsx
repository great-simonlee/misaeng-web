'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useCityInfo, useCityPath } from '@hooks/useCity'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'
import { BadgeCheckIcon, FlagIcon, MailIcon, NoCashIcon, ShieldCheckIcon } from '@widgets/ellieo/icons'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

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
  const tc = useT('community')
  const trust = BRAND_CONFIG.trust
  const sla = trust.reportSlaHours

  const trustItems = [
    { icon: BadgeCheckIcon, title: t('ellieo.trust.verifiedTitle'), body: t('ellieo.trust.verifiedBody') },
    { icon: NoCashIcon, title: t('ellieo.trust.noDepositTitle'), body: t('ellieo.trust.noDepositBody') },
    ...(sla
      ? [{ icon: FlagIcon, title: t('ellieo.trust.reportTitle', { hours: sla }), body: t('ellieo.trust.reportBody') }]
      : []),
  ]

  const boards = ELLIEO_BOARDS.filter((board) => board.available).map((board) => ({
    href: href(board.path),
    label: tc(`categories.${board.id}.title`),
  }))
  const support = [
    { href: href('/me'), label: t('footer.links.me') },
    { href: `mailto:${CONTACT_EMAIL}`, label: t('footer.links.contact') },
  ]
  const legal = [
    { href: href('/terms-of-use'), label: t('footer.links.terms') },
    { href: href('/privacy-policy'), label: t('footer.links.privacy') },
  ]

  // Bottom line: operator, license/brokerage (hidden until filled in), trademark, copyright, joined on one line
  const legalLine = [
    trust.operator ? t('ellieo.operatedBy', { company: trust.operator.name, city: trust.operator.city }) : null,
    trust.realEstateLicense ? t('ellieo.license', { number: trust.realEstateLicense }) : null,
    trust.brokerage ? t('ellieo.brokerage', { name: trust.brokerage }) : null,
    trust.trademarkRegNo ? t('ellieo.trademark', { brand: BRAND_CONFIG.name, number: trust.trademarkRegNo }) : null,
    '© 2026 Misaeng LLC',
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/\.$/, ''))

  return (
    <footer className='mt-auto bg-white pt-8 text-[var(--foreground)]'>
      {/* Trust: quiet, light panel. Who runs Ellieo, then the three commitments */}
      <div className='mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'>
        <section className='grid gap-6 rounded-2xl border border-[var(--border)] bg-[#f8f9fc] px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-10'>
          <div className='min-w-0'>
            <span className='inline-flex size-10 items-center justify-center rounded-xl bg-[var(--navy)] text-white'>
              <ShieldCheckIcon className='size-5' />
            </span>
            <h2 className='mt-3 text-[16px] font-bold tracking-[-0.01em] text-[var(--foreground)]'>
              {t('ellieo.trust.headline')}
            </h2>
            {trust.operator ? (
              <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>
                {t('ellieo.trust.subline', { company: trust.operator.name, city: trust.operator.city })}
              </p>
            ) : null}
          </div>
          <ul className='grid gap-5 sm:grid-cols-3 sm:gap-8'>
            {trustItems.map(({ icon: Icon, title, body }) => (
              <li key={title} className='min-w-0'>
                <span className='inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--navy)]'>
                  <Icon className='size-[18px]' />
                </span>
                <p className='mt-2.5 text-[14px] font-semibold text-[var(--foreground)]'>{title}</p>
                <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted)]'>{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className='mx-auto w-full max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]'>
          <div className='col-span-2 min-w-0 md:col-span-1'>
            <Link href={href()} className='inline-flex items-center' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
              <Image
                src={BRAND_CONFIG.assets.banner.src}
                alt={BRAND_CONFIG.name}
                width={BRAND_CONFIG.assets.banner.width}
                height={BRAND_CONFIG.assets.banner.height}
                className='h-5 w-auto'
              />
              {trust.registeredMark ? (
                <sup className='ml-0.5 self-start text-[8px] font-semibold text-[var(--muted)]'>®</sup>
              ) : null}
            </Link>
            <p className='mt-2.5 max-w-xs text-[13px] leading-relaxed text-[var(--muted)]'>{t('ellieo.footerTagline')}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className='mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--foreground)] hover:text-[var(--brand)]'
            >
              <MailIcon className='size-4' />
              {CONTACT_EMAIL}
            </a>
          </div>
          <LinkColumn title={t('footer.groups.community')} links={boards} />
          <LinkColumn title={t('footer.groups.support')} links={support} />
          <LinkColumn title={t('ellieo.legalGroup')} links={legal} />
        </div>

        <p className='mt-7 border-t border-[var(--border)] pt-4 text-[12px] leading-relaxed text-[var(--muted)]'>
          {legalLine.join(' · ')}
        </p>
      </div>
    </footer>
  )
}

function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className='min-w-0'>
      <p className='text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]'>{title}</p>
      <ul className='mt-2.5 space-y-1.5'>
        {links.map((item) => (
          <li key={item.href}>
            {/^(https?:|mailto:)/.test(item.href) ? (
              <a href={item.href} className='text-[13.5px] text-[var(--muted-foreground)] transition hover:text-[var(--brand)]'>
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className='text-[13.5px] text-[var(--muted-foreground)] transition hover:text-[var(--brand)]'>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
