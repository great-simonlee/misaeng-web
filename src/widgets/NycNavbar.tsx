'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuth } from '@hooks/useAuth'
import { cn } from '@lib'

const NYC_NAV_LINKS = [
  { href: '/nyc/housing', label: '하우징' },
] as const

const ACCOUNT_LINKS = [
  { href: '/nyc/me', label: '마이페이지', match: 'exact' as const },
  { href: '/nyc/me/posts', label: '내가 올린 글', match: 'prefix' as const },
  {
    href: '/nyc/me/likes',
    label: '내가 좋아요 누른 글',
    match: 'prefix' as const,
  },
] as const

const MOBILE_HEADER_HEIGHT_PX = 56

export function NycNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { user, loading, avatarURL, displayName } = useAuth()

  useEffect(() => {
    setTimeout(() => setMounted(true), 0)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!accountOpen) return

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = accountRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setAccountOpen(false)
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function isAccountActive(href: string, match: 'exact' | 'prefix') {
    return match === 'exact' ? pathname === href : isActive(href)
  }

  const mobileMenuOverlay =
    mounted &&
    typeof document !== 'undefined' &&
    createPortal(
      mobileOpen ? (
        <>
          <button
            type='button'
            aria-label='메뉴 닫기'
            className='fixed inset-0 z-[9998] bg-black/60 md:hidden'
            style={{ top: MOBILE_HEADER_HEIGHT_PX }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className='fixed left-0 right-0 max-h-[calc(100dvh-56px)] w-full overflow-y-auto rounded-b-2xl border-t border-[var(--border)] bg-white shadow-xl md:hidden'
            style={{ top: MOBILE_HEADER_HEIGHT_PX, zIndex: 9999 }}
            aria-label='NYC 모바일 메뉴'
          >
            <nav
              className='flex flex-col px-2 py-2 pb-4'
              aria-label='NYC 모바일 메뉴'
            >
              <div className='flex flex-col px-1'>
                <Link
                  href='/nyc'
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                    pathname === '/nyc'
                      ? 'bg-[#F64310]/[0.08] font-semibold text-[#F64310]'
                      : 'text-[var(--foreground)]',
                  )}
                >
                  커뮤니티 홈
                </Link>
                {NYC_NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                      isActive(href)
                        ? 'bg-[#F64310]/[0.08] font-semibold text-[#F64310]'
                        : 'text-[var(--foreground)]',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className='mx-1 mt-2 border-t border-[var(--border)] pt-2'>
                {!loading && user ? (
                  ACCOUNT_LINKS.map(({ href, label, match }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                        isAccountActive(href, match)
                          ? 'bg-[#F64310]/[0.08] font-semibold text-[#F64310]'
                          : 'text-[var(--foreground)]',
                      )}
                    >
                      {label}
                    </Link>
                  ))
                ) : (
                  <Link
                    href={`/nyc/login?next=${encodeURIComponent(pathname)}`}
                    onClick={() => setMobileOpen(false)}
                    className='flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] text-[15px] font-semibold text-[var(--foreground)] touch-manipulation active:bg-[var(--surface)]'
                  >
                    로그인
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null,
      document.body,
    )

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-[10000] border-b border-[var(--border)] md:sticky md:z-50',
          mobileOpen
            ? 'bg-[var(--background)] md:bg-[var(--background)]/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-[var(--background)]/80'
            : 'bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80',
        )}
      >
        <div className='relative mx-auto grid h-14 w-full max-w-7xl min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8'>
          <Link
            href='/nyc'
            className='flex min-h-[44px] min-w-0 items-center gap-2 justify-self-start transition-opacity active:opacity-80'
            aria-label='NYC 커뮤니티 홈'
          >
            <Image
              src='/banner.png'
              alt='Misaeng NYC'
              width={126}
              height={36}
              className='h-6 w-auto max-w-[96px] object-contain sm:h-[2.025rem] sm:max-w-none'
              priority
            />
            <span className='rounded-full bg-[#F64310]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#F64310] sm:px-2 sm:text-[10px]'>
              NYC
            </span>
          </Link>

          <nav
            className='hidden items-center justify-center gap-6 md:flex lg:gap-8'
            aria-label='NYC 메뉴'
          >
            {NYC_NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'font-semibold text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          {/* 모바일: 중앙 컬럼 자리 유지 */}
          <span className='md:hidden' aria-hidden />

          <div className='flex shrink-0 items-center justify-end gap-2 justify-self-end'>
            {!loading && !user && !mobileOpen && (
              <Link
                href={`/nyc/login?next=${encodeURIComponent(pathname)}`}
                className='inline-flex h-9 items-center rounded-full border border-[var(--border)] px-3.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]'
              >
                로그인
              </Link>
            )}

            {/* 모바일: 전체 메뉴 */}
            <button
              type='button'
              onClick={() => setMobileOpen((o) => !o)}
              className='inline-flex h-9 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-[var(--border)] bg-white p-0.5 touch-manipulation transition hover:bg-[var(--surface)] md:hidden'
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            >
              {mobileOpen ? (
                <span className='inline-flex size-7 items-center justify-center text-[var(--muted-foreground)]'>
                  <CloseIcon />
                </span>
              ) : (
                <>
                  <ProfileAvatar
                    photoURL={avatarURL}
                    displayName={displayName}
                  />
                  <span className='inline-flex size-7 items-center justify-center text-[var(--muted-foreground)]'>
                    <MenuIcon />
                  </span>
                </>
              )}
            </button>

            {/* 데스크톱: 계정 드롭다운 (마이페이지 / 내가 올린 글 / 좋아요) */}
            {!loading && user && (
              <div ref={accountRef} className='relative hidden md:block'>
                <button
                  type='button'
                  onClick={() => setAccountOpen((o) => !o)}
                  className='inline-flex h-9 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-[var(--border)] bg-white p-0.5 touch-manipulation transition hover:bg-[var(--surface)]'
                  aria-expanded={accountOpen}
                  aria-haspopup='menu'
                  aria-label={accountOpen ? '계정 메뉴 닫기' : '계정 메뉴 열기'}
                >
                  <ProfileAvatar
                    photoURL={avatarURL}
                    displayName={displayName}
                  />
                  <span className='inline-flex size-7 items-center justify-center text-[var(--muted-foreground)]'>
                    {accountOpen ? <CloseIcon /> : <MenuIcon />}
                  </span>
                </button>

                {accountOpen && (
                  <div
                    role='menu'
                    aria-label='계정 메뉴'
                    className='absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-white py-1 shadow-[0_8px_30px_rgba(15,23,42,0.12)]'
                  >
                    {ACCOUNT_LINKS.map(({ href, label, match }) => (
                      <Link
                        key={href}
                        href={href}
                        role='menuitem'
                        onClick={() => setAccountOpen(false)}
                        className={cn(
                          'flex h-10 items-center px-3.5 text-sm font-medium transition hover:bg-[var(--surface)]',
                          isAccountActive(href, match)
                            ? 'bg-[#F64310]/[0.08] font-semibold text-[#F64310]'
                            : 'text-[var(--foreground)]',
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileMenuOverlay}
    </>
  )
}

function MenuIcon() {
  return (
    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.8}
        d='M4 7h16M4 12h16M4 17h16'
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M6 18L18 6M6 6l12 12'
      />
    </svg>
  )
}

function ProfileAvatar({
  photoURL,
  displayName,
}: {
  photoURL?: string | null
  displayName?: string | null
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showPhoto = Boolean(photoURL) && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [photoURL])

  return (
    <span className='relative inline-flex size-7 shrink-0 overflow-hidden rounded-full bg-[#f1f5f9]'>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 프로필 URL (Google 등)
        <img
          src={photoURL!}
          alt={displayName ? `${displayName} 프로필` : '프로필'}
          width={28}
          height={28}
          className='size-full object-cover'
          onError={() => setImgFailed(true)}
          referrerPolicy='no-referrer'
        />
      ) : (
        <span className='flex size-full items-center justify-center text-[var(--slate-muted)]'>
          <svg
            viewBox='0 0 24 24'
            fill='currentColor'
            className='size-3.5'
            aria-hidden
          >
            <path d='M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z' />
          </svg>
        </span>
      )}
    </span>
  )
}
