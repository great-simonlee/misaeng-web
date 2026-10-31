'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { CitySelectModal } from '@widgets/nyc/CitySelectModal'
import { ChevronDownIcon, CloseIcon, HomeIcon, MenuIcon, PinIcon, UserIcon } from '@widgets/ellieo/icons'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/** Account links (labels: nav.account.<key>) */
const ACCOUNT_LINKS = [
  { path: '/me', key: 'me', exact: true },
  { path: '/me/posts', key: 'myPosts', exact: false },
  { path: '/me/likes', key: 'myLikes', exact: false },
] as const

/**
 * Ellieo site header + mobile bottom tab bar.
 * Same destinations as the Misaeng header (NycNavbar); different layout:
 * - top bar keeps the shared height (h-14 / sm:h-16) so sticky offsets in shared screens still line up
 * - desktop (lg+): icon + short label tabs, EN/VI switch, Log in + Join
 * - mobile: compact top bar with profile + menu buttons top right; each opens a panel under the header
 */
export function EllieoNavbar() {
  const pathname = usePathname()
  const city = useCity()
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('nav')
  const tc = useT('community')
  const { user, loading, avatarURL, displayName, isMisaengUser } = useEllieoViewer()
  const [cityOpen, setCityOpen] = useState(false)
  /** Phone drop-down under the header */
  const [panel, setPanel] = useState<'menu' | 'account' | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const [navPath, setNavPath] = useState(pathname)
  if (pathname !== navPath) {
    setNavPath(pathname)
    setAccountOpen(false)
    setCityOpen(false)
    setPanel(null)
  }

  useEffect(() => {
    if (!accountOpen) return
    const onPointer = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  const isActive = (target: string) => pathname === target || pathname.startsWith(`${target}/`)
  const home = href()
  const loginHref = cityLoginPath(city, pathname)
  const joinHref = `${cityLoginPath(city)}?mode=signup`
  const accountLinks = [
    ...ACCOUNT_LINKS,
    ...(isMisaengUser ? [{ path: '/team/credit-reviews', key: 'creditReviews', exact: false } as const] : []),
  ].map((item) => ({ ...item, href: href(item.path), label: t(`account.${item.key}`) }))
  const primaryBoards = ELLIEO_BOARDS.filter((board) => board.primary)
  const signedIn = !loading && Boolean(user)

  return (
    <>
      <header className='fixed inset-x-0 top-0 z-[10000] border-b border-[var(--border)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85'>
        <div className='mx-auto flex h-14 w-full max-w-7xl min-w-0 items-center gap-3 px-4 sm:h-16 sm:px-6 lg:gap-5 lg:px-8'>
          {/* Wordmark + city */}
          <div className='flex min-w-0 shrink-0 items-center gap-2.5'>
            <Link
              href={home}
              className='relative flex items-center touch-manipulation'
              aria-label={t('homeAria', { city: cityInfo.shortLabel })}
            >
              <Image
                src={BRAND_CONFIG.assets.banner.src}
                alt={BRAND_CONFIG.name}
                width={BRAND_CONFIG.assets.banner.width}
                height={BRAND_CONFIG.assets.banner.height}
                className='h-[22px] w-auto sm:h-6'
                priority
              />
              {BRAND_CONFIG.trust.registeredMark ? (
                <sup className='ml-0.5 self-start text-[9px] font-semibold text-[var(--muted)]'>®</sup>
              ) : null}
            </Link>
            <span className='h-5 w-px bg-[var(--border)]' aria-hidden />
            <button
              type='button'
              onClick={() => setCityOpen(true)}
              className='inline-flex min-h-[36px] items-center gap-1 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation transition hover:text-[var(--foreground)]'
              aria-haspopup='dialog'
              aria-expanded={cityOpen}
              aria-label={t('selectCity')}
            >
              <PinIcon className='size-4 text-[var(--brand)]' />
              <span className='whitespace-nowrap'>{cityInfo.shortLabel}</span>
              <ChevronDownIcon className='size-3.5' />
            </button>
          </div>

          {/* Desktop board tabs */}
          <nav
            className='hidden min-w-0 flex-1 items-center gap-0.5 lg:flex'
            aria-label={t('menuAria', { city: cityInfo.shortLabel })}
          >
            {primaryBoards.map((board) => {
              const target = href(board.path)
              const active = isActive(target)
              const Icon = board.icon
              return (
                <Link
                  key={board.id}
                  href={target}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium whitespace-nowrap transition-colors duration-150 xl:px-4',
                    active
                      ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand-deep)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[#f3f5f9] hover:text-[var(--foreground)]',
                  )}
                >
                  {/* Icons only from 1280px: below that the labels need the room (Vietnamese labels are long) */}
                  <Icon className='hidden size-[18px] xl:block' />
                  {t(`ellieo.short.${board.id}`)}
                </Link>
              )
            })}
          </nav>
          <span className='flex-1 lg:hidden' aria-hidden />

          {/* Right side */}
          <div className='flex shrink-0 items-center gap-2'>
            <div className='hidden sm:block'>
              <LanguageMenu variant='segmented' />
            </div>
            {signedIn ? (
              <div ref={accountRef} className='relative hidden lg:block'>
                <button
                  type='button'
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-haspopup='menu'
                  aria-expanded={accountOpen}
                  aria-label={accountOpen ? t('closeAccountMenu') : t('openAccountMenu')}
                  className='inline-flex h-9 items-center gap-2 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]'
                >
                  <Avatar photoURL={avatarURL} name={displayName} />
                  <span className='max-w-[8rem] truncate'>{displayName || t('profileAltFallback')}</span>
                  <ChevronDownIcon className='size-3.5 text-[var(--muted)]' />
                </button>
                {accountOpen ? (
                  <div
                    role='menu'
                    aria-label={t('accountMenu')}
                    className='absolute right-0 top-full mt-2 min-w-[13rem] rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[0_18px_40px_-20px_rgba(14,26,47,0.45)]'
                  >
                    {accountLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role='menuitem'
                        className={cn(
                          'flex h-10 items-center rounded-lg px-3 text-[14px] transition hover:bg-[var(--surface)]',
                          (item.exact ? pathname === item.href : isActive(item.href))
                            ? 'font-semibold text-[var(--brand-deep)]'
                            : 'text-[var(--foreground)]',
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : !loading ? (
              <div className='hidden items-center gap-1.5 lg:flex'>
                <Link
                  href={loginHref}
                  className='inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]'
                >
                  {t('login')}
                </Link>
                <Link
                  href={joinHref}
                  className='inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
                >
                  {t('ellieo.join')}
                </Link>
              </div>
            ) : null}

            {/* Phones: profile and menu, top right (no bottom tab bar) */}
            <div className='flex items-center gap-1 lg:hidden'>
              <button
                type='button'
                onClick={() => {
                                setPanel((open) => (open === 'account' ? null : 'account'))
                }}
                aria-expanded={panel === 'account'}
                aria-label={panel === 'account' ? t('closeAccountMenu') : t('openAccountMenu')}
                className='inline-flex size-10 items-center justify-center rounded-full transition active:bg-[var(--surface)]'
              >
                {signedIn ? (
                  <Avatar photoURL={avatarURL} name={displayName} />
                ) : (
                  <UserIcon className='size-[22px] text-[var(--foreground)]' />
                )}
              </button>
              <button
                type='button'
                onClick={() => setPanel((open) => (open === 'menu' ? null : 'menu'))}
                aria-expanded={panel === 'menu'}
                aria-label={panel === 'menu' ? t('closeMenu') : t('openMenu')}
                className='inline-flex size-10 items-center justify-center rounded-full text-[var(--foreground)] transition active:bg-[var(--surface)]'
              >
                {panel === 'menu' ? <CloseIcon className='size-[22px]' /> : <MenuIcon className='size-[22px]' />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Phone drop-down panels under the header: menu (home, boards, language) / account */}
      {panel ? (
        <>
          <button
            type='button'
            aria-label={t('closeMenu')}
            onClick={() => setPanel(null)}
            className='fixed inset-0 top-14 z-[9990] bg-[rgb(14_26_47/0.25)] lg:hidden'
          />
          <div className='fixed inset-x-0 top-14 z-[9995] max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-[var(--border)] bg-white shadow-[0_24px_48px_-24px_rgba(14,26,47,0.35)] lg:hidden'>
            {panel === 'menu' ? (
              <nav aria-label={t('mobileMenuAria', { city: cityInfo.shortLabel })} className='px-4 pb-5 pt-3'>
                <ul className='grid gap-0.5'>
                  {[{ id: 'home', label: t('ellieo.tabs.home'), path: home, icon: HomeIcon, available: true }, ...ELLIEO_BOARDS.map((board) => ({
                    id: board.id,
                    label: tc(`categories.${board.id}.title`),
                    path: href(board.path),
                    icon: board.icon,
                    available: board.available,
                  }))].map((item) => {
                    const Icon = item.icon
                    const active = item.id === 'home' ? pathname === home : isActive(item.path)
                    const body = (
                      <>
                        <span
                          className={cn(
                            'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                            active ? 'bg-[var(--brand)] text-white' : 'bg-[var(--brand-soft)] text-[var(--brand)]',
                          )}
                        >
                          <Icon className='size-[18px]' />
                        </span>
                        <span className='min-w-0 flex-1 truncate text-[15px] font-semibold'>{item.label}</span>
                        {!item.available ? (
                          <span className='shrink-0 text-[12px] font-medium text-[var(--muted)]'>{t('ellieo.comingSoon')}</span>
                        ) : null}
                      </>
                    )
                    return (
                      <li key={item.id}>
                        {item.available ? (
                          <Link
                            href={item.path}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex h-12 items-center gap-3 rounded-xl px-2 transition active:bg-[var(--surface)]',
                              active ? 'text-[var(--brand-deep)]' : 'text-[var(--foreground)]',
                            )}
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className='flex h-12 items-center gap-3 px-2 text-[var(--muted)] opacity-70' aria-disabled>
                            {body}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <div className='mt-3 flex items-center justify-between border-t border-[var(--border)] px-2 pt-3'>
                  <span className='text-[13px] font-semibold text-[var(--muted-foreground)]'>{t('ellieo.language')}</span>
                  <LanguageMenu variant='segmented' />
                </div>
              </nav>
            ) : (
              <div className='px-4 pb-5 pt-4'>
                {signedIn ? (
                  <>
                    <div className='flex items-center gap-3 px-2 pb-3'>
                      <Avatar photoURL={avatarURL} name={displayName} />
                      <span className='min-w-0 truncate text-[15px] font-bold text-[var(--foreground)]'>
                        {displayName || t('profileAltFallback')}
                      </span>
                    </div>
                    <ul className='grid gap-0.5 border-t border-[var(--border)] pt-2'>
                      {accountLinks.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex h-11 items-center rounded-xl px-2 text-[15px] font-medium transition active:bg-[var(--surface)]',
                              (item.exact ? pathname === item.href : isActive(item.href))
                                ? 'text-[var(--brand-deep)]'
                                : 'text-[var(--foreground)]',
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className='grid grid-cols-2 gap-2'>
                    <Link
                      href={loginHref}
                      className='inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] text-[15px] font-semibold text-[var(--foreground)]'
                    >
                      {t('login')}
                    </Link>
                    <Link
                      href={joinHref}
                      className='inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white'
                    >
                      {t('ellieo.join')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}

      <CitySelectModal open={cityOpen} onClose={() => setCityOpen(false)} currentCity={city} />
    </>
  )
}

function Avatar({ photoURL, name }: { photoURL?: string | null; name?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null)
  const show = Boolean(photoURL) && failed !== photoURL
  return (
    <span className='inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-subtle)] text-[12px] font-semibold text-[var(--brand-deep)]'>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- external profile URL
        <img
          src={photoURL!}
          alt=''
          width={28}
          height={28}
          className='size-full object-cover'
          referrerPolicy='no-referrer'
          onError={() => setFailed(photoURL ?? null)}
        />
      ) : (
        (name || '?').trim().slice(0, 1).toUpperCase()
      )}
    </span>
  )
}
