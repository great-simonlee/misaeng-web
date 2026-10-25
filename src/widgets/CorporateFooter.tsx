import Image from 'next/image'
import Link from 'next/link'

import { brandConfig } from '@lib/brand'
import { FooterLinkGroup, SOCIAL_LINKS } from '@widgets/NycFooter'

/** 회사 사이트(misaeng.com) 푸터 — 도시 서비스 푸터(NycFooter)와 같은 모양, 회사용 링크 */
const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/our-service', label: 'Our Service' },
  { href: '/careers', label: 'Careers' },
  { href: '/roadmap', label: 'Roadmap' },
]

const PRODUCT_LINKS = [
  { href: '/mobile-app', label: 'Ellieo app' },
  { href: '/nyc', label: 'Misaeng NYC community' },
  { href: '/boston', label: 'Misaeng Boston community' },
  { href: brandConfig('ellieo').siteUrl, label: 'Ellieo website', external: true },
]

const SUPPORT_LINKS = [
  { href: '/contact', label: 'Contact us' },
  { href: '/contact', label: 'Partner inquiry' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
]

export function CorporateFooter() {
  return (
    <footer className='relative overflow-hidden bg-[#0b1220] text-white'>
      <div className='pointer-events-none absolute inset-0' aria-hidden>
        <div className='absolute -left-16 top-0 h-40 w-40 rounded-full bg-brand/15 blur-3xl' />
        <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent' />
      </div>

      <div className='relative mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-9'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8'>
          <div className='min-w-0'>
            <Link href='/' className='inline-flex items-center gap-2 touch-manipulation' aria-label='Misaeng'>
              <span className='inline-flex size-7 items-center justify-center overflow-hidden rounded-lg bg-white/95'>
                <Image src='/img/logo_square.png' alt='' width={28} height={28} className='size-5 object-contain' />
              </span>
              <span className='text-[15px] font-semibold tracking-tight text-white'>Misaeng</span>
            </Link>
            <p className='mt-2 max-w-sm text-[13px] leading-snug text-white/45'>
              Misaeng LLC operates Ellieo, the verified housing &amp; roommate app for students and professionals in New
              York City.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <a
              href='mailto:info@misaeng.com'
              className='inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3.5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-brand-hover'
            >
              info@misaeng.com
            </a>
            <Link
              href='/mobile-app'
              className='inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-[13px] font-semibold text-white/85 touch-manipulation transition hover:border-white/30 hover:bg-white/[0.08]'
            >
              Download Ellieo
            </Link>
          </div>
        </div>

        <div className='mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 sm:mt-7 sm:gap-8 sm:pt-6'>
          <FooterLinkGroup title='Company' links={COMPANY_LINKS} />
          <FooterLinkGroup title='Products' links={PRODUCT_LINKS} />
          <FooterLinkGroup title='Support' links={SUPPORT_LINKS} />
        </div>

        <div className='mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-5'>
          <div className='min-w-0 space-y-1.5'>
            <p className='text-[11px] text-white/40 sm:text-[12px]'>
              Copyright © 2026 Misaeng LLC. All Rights Reserved.
            </p>
            <p className='text-[11px] text-white/35 sm:text-[12px]'>
              US Headquarters · 45 Rockefeller Plaza, Fl 20, New York, NY 10111
            </p>
          </div>
          <div className='flex items-center gap-1.5'>
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={item.label}
                className='inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 touch-manipulation transition hover:border-brand/45 hover:bg-brand/15 hover:text-white'
              >
                <item.icon className='size-3.5' />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
