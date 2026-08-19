import Image from 'next/image'
import Link from 'next/link'

const COMMUNITY_LINKS = [
  { href: '/nyc/housing', label: '하우징' },
  { href: '/nyc/partners', label: '파트너' },
] as const

const COMPANY_LINKS = [
  { href: '/', label: '회사 사이트' },
  { href: '/about', label: '회사 소개' },
  { href: '/our-service', label: '서비스' },
  { href: '/careers', label: '채용' },
] as const

const SUPPORT_LINKS = [
  { href: '/contact', label: '문의하기' },
  { href: '/nyc/me', label: '마이페이지' },
  {
    href: 'mailto:info@misaeng.com?subject=%5BMisaeng%5D%20%EA%B4%91%EA%B3%A0%C2%B7%EC%A0%9C%ED%9C%B4',
    label: '광고·제휴',
    external: true,
  },
] as const

const SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/', label: 'Instagram', icon: InstagramIcon },
  { href: 'https://www.youtube.com/', label: 'YouTube', icon: YoutubeIcon },
  { href: 'https://www.facebook.com/', label: 'Facebook', icon: FacebookIcon },
] as const

export function NycFooter() {
  return (
    <footer className='relative overflow-hidden bg-[#0b1220] text-white'>
      <div className='pointer-events-none absolute inset-0' aria-hidden>
        <div className='absolute -left-16 top-0 h-40 w-40 rounded-full bg-[#F64310]/15 blur-3xl' />
        <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F64310]/70 to-transparent' />
      </div>

      <div className='relative mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-9'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8'>
          <div className='min-w-0'>
            <Link
              href='/nyc'
              className='inline-flex items-center gap-2 touch-manipulation'
              aria-label='Misaeng NYC'
            >
              <span className='inline-flex size-7 items-center justify-center overflow-hidden rounded-lg bg-white/95'>
                <Image
                  src='/img/logo_square.png'
                  alt=''
                  width={28}
                  height={28}
                  className='size-5 object-contain'
                />
              </span>
              <span className='text-[15px] font-semibold tracking-tight text-white'>
                Misaeng NYC
              </span>
            </Link>
            <p className='mt-2 max-w-sm text-[13px] leading-snug text-white/45'>
              유학생·직장인을 위한 NYC 커뮤니티
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <a
              href='mailto:info@misaeng.com'
              className='inline-flex h-9 items-center justify-center rounded-xl bg-[#F64310] px-3.5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[#d93a0e]'
            >
              info@misaeng.com
            </a>
            <Link
              href='/contact'
              className='inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-[13px] font-semibold text-white/85 touch-manipulation transition hover:border-white/30 hover:bg-white/[0.08]'
            >
              문의하기
            </Link>
          </div>
        </div>

        <div className='mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 sm:mt-7 sm:gap-8 sm:pt-6'>
          <FooterLinkGroup title='커뮤니티' links={COMMUNITY_LINKS} />
          <FooterLinkGroup title='회사' links={COMPANY_LINKS} />
          <FooterLinkGroup title='지원' links={SUPPORT_LINKS} />
        </div>

        <div className='mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-5'>
          <div className='min-w-0 space-y-1.5'>
            <p className='text-[11px] text-white/40 sm:text-[12px]'>
              Copyright © 2026 Misaeng LLC. All Rights Reserved.
            </p>
            <nav
              className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-[12px]'
              aria-label='Legal'
            >
              <Link
                href='/terms'
                className='text-white/45 touch-manipulation transition hover:text-white'
              >
                Terms of Use
              </Link>
              <span className='text-white/20' aria-hidden>
                ·
              </span>
              <Link
                href='/privacy'
                className='text-white/45 touch-manipulation transition hover:text-white'
              >
                Privacy Policy
              </Link>
            </nav>
          </div>
          <div className='flex items-center gap-1.5'>
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={item.label}
                className='inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65 touch-manipulation transition hover:border-[#F64310]/45 hover:bg-[#F64310]/15 hover:text-white'
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

function FooterLinkGroup({
  title,
  links,
}: {
  title: string
  links: readonly {
    href: string
    label: string
    external?: boolean
  }[]
}) {
  return (
    <div>
      <p className='text-[10px] font-semibold tracking-[0.16em] text-white/35'>
        {title}
      </p>
      <ul className='mt-2.5 space-y-1'>
        {links.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            {item.external ? (
              <a
                href={item.href}
                className='inline-flex min-h-[28px] items-center text-[12px] text-white/65 touch-manipulation transition hover:text-white sm:text-[13px]'
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className='inline-flex min-h-[28px] items-center text-[12px] text-white/65 touch-manipulation transition hover:text-white sm:text-[13px]'
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.5A3 3 0 0 0 4.5 7.5v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9Zm9.75 1.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 8.25A3.75 3.75 0 1 1 12 15.75 3.75 3.75 0 0 1 12 8.25Zm0 1.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z' />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z' />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden>
      <path d='M13.5 21v-7.5H16l.4-3H13.5V8.7c0-.9.3-1.5 1.6-1.5H16.5V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.3V21h3.2Z' />
    </svg>
  )
}
