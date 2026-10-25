'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuth } from '@hooks/useAuth'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { CitySelectModal } from '@widgets/nyc/CitySelectModal'

/** 문구: nav.links.<key> */
const NAV_LINKS = [
  { path: '/housing', key: 'housing' },
  { path: '/food', key: 'food' },
  { path: '/marketplace', key: 'marketplace' },
  { path: '/status', key: 'status' },
  { path: '/job-review', key: 'jobReview' },
  { path: '/roommate', key: 'roommate' },
  { path: '/anonymous', key: 'anonymous' },
] as const

/** 문구: nav.account.<key> */
const ACCOUNT_LINKS = [
  { path: '/me', key: 'me', match: 'exact' as const },
  { path: '/me/posts', key: 'myPosts', match: 'prefix' as const },
  {
    path: '/me/likes',
    key: 'myLikes',
    match: 'prefix' as const,
  },
] as const

const TEAM_ACCOUNT_LINKS = [
  {
    path: '/team/credit-reviews',
    key: 'creditReviews',
    match: 'prefix' as const,
  },
] as const

const MOBILE_HEADER_HEIGHT_CLASS = 'top-14 sm:top-16'

export function NycNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const [accountMenuStyle, setAccountMenuStyle] = useState<{
    top: number
    right: number
  } | null>(null)
  const pathname = usePathname()
  const city = useCity()
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const { user, loading, avatarURL, displayName, isMisaengUser } = useAuth()
  const t = useT('nav')
  const navLinks = NAV_LINKS.map((item) => ({
    ...item,
    label: t(`links.${item.key}`),
    href: href(item.path),
  }))
  const accountMenuLinks = (
    isMisaengUser
      ? [...ACCOUNT_LINKS, ...TEAM_ACCOUNT_LINKS]
      : [...ACCOUNT_LINKS]
  ).map((item) => ({
    ...item,
    label: t(`account.${item.key}`),
    href: href(item.path),
  }))
  const [navPath, setNavPath] = useState(pathname)
  if (pathname !== navPath) {
    setNavPath(pathname)
    setMobileOpen(false)
    setAccountOpen(false)
    setCityOpen(false)
  }

  useEffect(() => {
    setTimeout(() => setMounted(true), 0)
  }, [])

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

    function updateAccountMenuPosition() {
      const button = accountButtonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      setAccountMenuStyle({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }

    updateAccountMenuPosition()
    window.addEventListener('resize', updateAccountMenuPosition)
    window.addEventListener('scroll', updateAccountMenuPosition, true)

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const root = accountRef.current
      const menu = document.getElementById('nyc-account-menu')
      const target = e.target
      if (!(target instanceof Node)) return
      if (root?.contains(target) || menu?.contains(target)) return
      setAccountOpen(false)
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', updateAccountMenuPosition)
      window.removeEventListener('scroll', updateAccountMenuPosition, true)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  useEffect(() => {
    if (accountOpen) return
    setTimeout(() => setAccountMenuStyle(null), 0)
  }, [accountOpen])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function isAccountActive(href: string, match: 'exact' | 'prefix') {
    return match === 'exact' ? pathname === href : isActive(href)
  }

  const accountMenuOverlay =
    mounted &&
    typeof document !== 'undefined' &&
    accountOpen &&
    accountMenuStyle &&
    createPortal(
      <div
        id='nyc-account-menu'
        role='menu'
        aria-label={t('accountMenu')}
        style={{
          position: 'fixed',
          top: accountMenuStyle.top,
          right: accountMenuStyle.right,
          zIndex: 10001,
        }}
        className='hidden min-w-[12.5rem] rounded-xl border border-[var(--border)] bg-white py-1 shadow-[0_8px_30px_rgba(15,23,42,0.12)] xl:block'
      >
        {accountMenuLinks.map(({ href, label, match }) => (
          <Link
            key={href}
            href={href}
            role='menuitem'
            onClick={() => setAccountOpen(false)}
            className={cn(
              'flex h-10 items-center whitespace-nowrap px-3.5 text-sm font-medium transition hover:bg-[var(--surface)]',
              isAccountActive(href, match)
                ? 'bg-brand/[0.08] font-semibold text-brand'
                : 'text-[var(--foreground)]',
            )}
          >
            {label}
          </Link>
        ))}
      </div>,
      document.body,
    )

  const mobileMenuOverlay =
    mounted &&
    typeof document !== 'undefined' &&
    createPortal(
      mobileOpen ? (
        <>
          <button
            type='button'
            aria-label={t('closeMenu')}
            className={cn(
              'fixed inset-x-0 bottom-0 z-[9998] bg-black/60 xl:hidden',
              MOBILE_HEADER_HEIGHT_CLASS,
            )}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              'fixed inset-x-0 max-h-[calc(100dvh-3.5rem)] w-full overflow-y-auto rounded-b-2xl border-t border-[var(--border)] bg-white shadow-xl sm:max-h-[calc(100dvh-4rem)] xl:hidden',
              MOBILE_HEADER_HEIGHT_CLASS,
            )}
            style={{ zIndex: 9999 }}
            aria-label={t('mobileMenuAria', { city: cityInfo.shortLabel })}
          >
            <nav
              className='flex flex-col px-2 py-2 pb-4'
              aria-label={t('mobileMenuAria', { city: cityInfo.shortLabel })}
            >
              <div className='flex flex-col px-1'>
                <Link
                  href={href()}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                    pathname === href()
                      ? 'bg-brand/[0.08] font-semibold text-brand'
                      : 'text-[var(--foreground)]',
                  )}
                >
                  {t('communityHome')}
                </Link>
                {navLinks.map(({ href: itemHref, label }) => (
                  <Link
                    key={itemHref}
                    href={itemHref}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                      isActive(itemHref)
                        ? 'bg-brand/[0.08] font-semibold text-brand'
                        : 'text-[var(--foreground)]',
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <LanguageMenu
                variant='list'
                className='mx-1 mt-2 border-t border-[var(--border)] pt-2 sm:hidden'
              />

              <div className='mx-1 mt-2 border-t border-[var(--border)] pt-2'>
                {!loading && user ? (
                  accountMenuLinks.map(({ href, label, match }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex h-11 items-center rounded-xl px-3 text-[15px] font-medium touch-manipulation active:bg-[var(--surface)]',
                        isAccountActive(href, match)
                          ? 'bg-brand/[0.08] font-semibold text-brand'
                          : 'text-[var(--foreground)]',
                      )}
                    >
                      {label}
                    </Link>
                  ))
                ) : (
                  <Link
                    href={cityLoginPath(city, pathname)}
                    onClick={() => setMobileOpen(false)}
                    className='flex h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] text-[15px] font-semibold text-[var(--foreground)] touch-manipulation active:bg-[var(--surface)]'
                  >
                    {t('login')}
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
          'fixed top-0 left-0 right-0 z-[10000] overflow-visible border-b border-[var(--border)]',
          mobileOpen
            ? 'bg-[var(--background)]'
            : 'bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80',
        )}
      >
        <div className='relative mx-auto grid h-14 w-full max-w-7xl min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8'>
          <div className='flex min-h-[44px] shrink-0 items-center gap-1.5 justify-self-start sm:gap-2'>
            <Link
              href={href()}
              className='flex items-center transition-opacity active:opacity-80'
              aria-label={t('homeAria', { city: cityInfo.shortLabel })}
            >
              <Image
                src={BRAND_CONFIG.assets.banner.src}
                alt={t('brandCity', {
                  brand: BRAND_CONFIG.name,
                  city: cityInfo.shortLabel,
                })}
                width={126}
                height={36}
                className='h-6 w-auto max-w-[96px] object-contain sm:h-[2.025rem] sm:max-w-none'
                priority
              />
            </Link>
            <button
              type='button'
              onClick={() => setCityOpen(true)}
              className='inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-brand touch-manipulation transition hover:bg-brand/15 sm:px-2 sm:text-[10px]'
              aria-haspopup='dialog'
              aria-expanded={cityOpen}
              aria-label={t('selectCity')}
            >
              {cityInfo.name}
              <ChevronIcon className='size-2.5 sm:size-3' />
            </button>
          </div>

          <nav
            className='hidden min-w-0 items-center justify-center gap-4 overflow-hidden xl:flex 2xl:gap-6'
            aria-label={t('menuAria', { city: cityInfo.shortLabel })}
          >
            {navLinks.map(({ href: itemHref, label }) => (
              <Link
                key={itemHref}
                href={itemHref}
                className={cn(
                  'shrink-0 whitespace-nowrap text-[13px] font-medium transition-colors 2xl:text-sm',
                  isActive(itemHref)
                    ? 'font-semibold text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          {/* 좁은 화면: 중앙 컬럼 자리 유지 */}
          <span className='xl:hidden' aria-hidden />

          <div className='flex shrink-0 items-center justify-end gap-2 justify-self-end'>
            {!mobileOpen ? <LanguageMenu className='hidden sm:block' /> : null}
            {!loading && !user && (
              <>
                {!mobileOpen && (
                  <Link
                    href={cityLoginPath(city, pathname)}
                    className='inline-flex h-9 items-center rounded-full border border-[var(--border)] px-3.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]'
                  >
                    {t('login')}
                  </Link>
                )}
                <button
                  type='button'
                  onClick={() => setMobileOpen((o) => !o)}
                  className='inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted-foreground)] touch-manipulation transition hover:bg-[var(--surface)] xl:hidden'
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
                >
                  {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              </>
            )}

            {!loading && user && (
              <>
                {isMisaengUser && (
                  <span className='text-[13px] font-semibold tracking-wide text-brand sm:text-sm'>
                    Agent
                  </span>
                )}

                {/* 좁은 화면: 프로필 + 전체 메뉴 */}
                <button
                  type='button'
                  onClick={() => setMobileOpen((o) => !o)}
                  className='inline-flex h-9 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-[var(--border)] bg-white p-0.5 touch-manipulation transition hover:bg-[var(--surface)] xl:hidden'
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
                >
                  <ProfileAvatar
                    photoURL={avatarURL}
                    displayName={displayName}
                  />
                  <span className='inline-flex size-7 items-center justify-center text-[var(--muted-foreground)]'>
                    {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                  </span>
                </button>

                {/* 넓은 데스크톱: 계정 드롭다운 */}
                <div ref={accountRef} className='relative hidden xl:block'>
                  <button
                    ref={accountButtonRef}
                    type='button'
                    onClick={() => setAccountOpen((o) => !o)}
                    className='inline-flex h-9 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-[var(--border)] bg-white p-0.5 touch-manipulation transition hover:bg-[var(--surface)]'
                    aria-expanded={accountOpen}
                    aria-haspopup='menu'
                    aria-label={
                      accountOpen ? t('closeAccountMenu') : t('openAccountMenu')
                    }
                  >
                    <ProfileAvatar
                      photoURL={avatarURL}
                      displayName={displayName}
                    />
                    <span className='inline-flex size-7 items-center justify-center text-[var(--muted-foreground)]'>
                      {accountOpen ? <CloseIcon /> : <MenuIcon />}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {accountMenuOverlay}
      {mobileMenuOverlay}
      <CitySelectModal
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        currentCity={city}
      />
    </>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 20 20'
      fill='currentColor'
      className={className}
      aria-hidden
    >
      <path
        fillRule='evenodd'
        d='M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z'
        clipRule='evenodd'
      />
    </svg>
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
  const t = useT('nav')
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showPhoto = Boolean(photoURL) && failedSrc !== photoURL

  return (
    <span className='relative inline-flex size-7 shrink-0 overflow-hidden rounded-full bg-[#f1f5f9]'>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 프로필 URL (Google 등)
        <img
          src={photoURL!}
          alt={
            displayName
              ? t('profileAlt', { name: displayName })
              : t('profileAltFallback')
          }
          width={28}
          height={28}
          className='size-full object-cover'
          onError={() => setFailedSrc(photoURL ?? null)}
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
