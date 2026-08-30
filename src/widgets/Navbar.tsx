'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@lib'
import { createPortal } from 'react-dom'

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/our-service', label: 'Our Service' },
  { href: '/careers', label: 'Careers' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/contact', label: 'Contact' },
] as const

/** 모바일에서 헤더 높이(px). 메뉴 오버레이 top에 사용 */
const MOBILE_HEADER_HEIGHT_PX = 56

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setTimeout(() => {
      setMounted(true)
    }, 0)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const mobileMenuOverlay =
    mounted &&
    typeof document !== 'undefined' &&
    createPortal(
      mobileOpen ? (
        <>
          {/* 배경 딤: 검정 + opacity, 탭 시 메뉴 닫힘 */}
          <button
            type='button'
            aria-label='Close menu'
            className='fixed inset-0 z-[9998] bg-black/70 md:hidden'
            style={{ top: MOBILE_HEADER_HEIGHT_PX }}
            onClick={() => setMobileOpen(false)}
          />
          {/* 메뉴 패널 */}
          <div
            className='fixed left-0 right-0 w-full rounded-b-2xl border-t border-[var(--border)] bg-white shadow-xl md:hidden'
            style={{ top: MOBILE_HEADER_HEIGHT_PX, zIndex: 9999 }}
            aria-label='Mobile menu'
          >
            <nav className='flex flex-col py-1 pb-4' aria-label='Mobile menu'>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'min-h-[48px] flex items-center px-4 text-sm font-medium text-[var(--foreground)] active:bg-[var(--surface)]',
                    pathname === href || pathname.startsWith(`${href}/`)
                      ? 'text-[var(--brand)] font-semibold'
                      : ''
                  )}
                >
                  {label}
                </Link>
              ))}
              <Link
                href='/contact'
                onClick={() => setMobileOpen(false)}
                className='mx-4 mb-3 mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-[#F64310] text-sm font-semibold text-white active:bg-[#d93a0e]'
              >
                Partner Inquiry
              </Link>
            </nav>
          </div>
        </>
      ) : null,
      document.body
    )

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-[10000] border-b border-[var(--border)]',
          mobileOpen
            ? 'bg-[var(--background)]'
            : 'bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80'
        )}
      >
        <div className='mx-auto flex h-14 w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8'>
          <Link
            href='/'
            className='flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 transition-opacity active:opacity-80 sm:min-h-0 sm:min-w-0 sm:gap-3'
            aria-label='Misaeng home'
          >
            <Image
              src='/banner.png'
              alt='Misaeng'
              width={126}
              height={36}
              className='h-[1.575rem] w-auto max-w-[108px] object-contain sm:h-[2.025rem] sm:max-w-none'
              priority
            />
          </Link>

          <nav className='hidden items-center gap-6 md:flex lg:gap-8' aria-label='Main navigation'>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? 'text-[var(--foreground)] font-semibold'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className='flex items-center gap-1'>
            <Link
              href='/contact'
              className='hidden rounded-full bg-[#F64310] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#F64310]/25 transition hover:bg-[#d93a0e] hover:shadow-[#F64310]/35 sm:inline-block'
            >
              Partner Inquiry
            </Link>

            <button
              type='button'
              onClick={() => setMobileOpen((o) => !o)}
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition active:bg-[var(--surface)] hover:bg-[var(--surface)] md:hidden md:h-10 md:w-10'
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              ) : (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴: body에 포탈로 렌더링해 항상 최상위 레이어에 표시 */}
      {mobileMenuOverlay}
    </>
  )
}
