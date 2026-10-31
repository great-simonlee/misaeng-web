'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { BottomSheet } from '@components'
import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { CitySelectModal } from '@widgets/nyc/CitySelectModal'
import {
  BriefcaseIcon,
  ChevronDownIcon,
  GridIcon,
  HomeIcon,
  KeyIcon,
  PinIcon,
  UserIcon,
} from '@widgets/ellieo/icons'
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
 * - mobile: compact top bar, fixed bottom tab bar (Home, Housing, Boards, Jobs, Me), boards in a sheet
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
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const [navPath, setNavPath] = useState(pathname)
  if (pathname !== navPath) {
    setNavPath(pathname)
    setBoardsOpen(false)
    setAccountOpen(false)
    setCityOpen(false)
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
  const boardActive = ELLIEO_BOARDS.some(
    (board) => board.id !== 'housing' && board.id !== 'job-review' && isActive(href(board.path)),
  )
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
            <LanguageMenu variant='segmented' />
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
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className='fixed inset-x-0 bottom-0 z-[9000] border-t border-[var(--border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:hidden'
        aria-label={t('mobileMenuAria', { city: cityInfo.shortLabel })}
      >
        <ul className='mx-auto grid h-[3.75rem] max-w-lg grid-cols-5'>
          <TabItem href={home} label={t('ellieo.tabs.home')} active={pathname === home} icon={HomeIcon} />
          <TabItem
            href={href('/housing')}
            label={t('ellieo.tabs.housing')}
            active={isActive(href('/housing'))}
            icon={KeyIcon}
          />
          <li className='min-w-0'>
            <button
              type='button'
              onClick={() => setBoardsOpen(true)}
              aria-haspopup='dialog'
              aria-expanded={boardsOpen}
              className={cn(
                'flex h-full w-full flex-col items-center justify-center gap-0.5 touch-manipulation',
                boardActive || boardsOpen ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
              )}
            >
              <GridIcon className='size-[22px]' />
              <span className='max-w-full truncate px-1 text-[11px] font-medium leading-tight'>
                {t('ellieo.tabs.boards')}
              </span>
            </button>
          </li>
          <TabItem
            href={href('/job-review')}
            label={t('ellieo.tabs.jobs')}
            active={isActive(href('/job-review'))}
            icon={BriefcaseIcon}
          />
          <TabItem
            href={signedIn ? href('/me') : loginHref}
            label={signedIn ? t('ellieo.tabs.me') : t('login')}
            active={signedIn ? isActive(href('/me')) : pathname.endsWith('/login')}
            icon={UserIcon}
          />
        </ul>
      </nav>

      <BottomSheet open={boardsOpen} onClose={() => setBoardsOpen(false)} title={t('ellieo.boardsTitle')}>
        <div className='px-4 pb-5'>
          <ul className='grid grid-cols-1 gap-1.5'>
            {ELLIEO_BOARDS.map((board) => {
              const Icon = board.icon
              const body = (
                <>
                  <span
                    className={cn(
                      'inline-flex size-10 shrink-0 items-center justify-center rounded-[10px]',
                      board.available
                        ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                        : 'bg-[var(--surface)] text-[var(--muted)]',
                    )}
                  >
                    <Icon className='size-5' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
                      {tc(`categories.${board.id}.title`)}
                    </span>
                    <span className='block text-[13px] leading-snug text-[var(--muted)]'>
                      {board.available
                        ? tc(`categories.${board.id}.description`, { city: cityInfo.shortLabel })
                        : t('ellieo.comingSoon')}
                    </span>
                  </span>
                </>
              )
              return (
                <li key={board.id}>
                  {board.available ? (
                    <Link
                      href={href(board.path)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-2.5 py-2.5 touch-manipulation transition active:bg-[var(--surface)]',
                        isActive(href(board.path)) && 'bg-[var(--brand-soft)]',
                      )}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className='flex items-center gap-3 px-2.5 py-2.5 opacity-70' aria-disabled>
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {signedIn ? (
            <div className='mt-4 border-t border-[var(--border)] pt-3'>
              {accountLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className='flex h-11 items-center rounded-lg px-2.5 text-[15px] font-medium text-[var(--foreground)] active:bg-[var(--surface)]'
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className='mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4'>
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
      </BottomSheet>

      <CitySelectModal open={cityOpen} onClose={() => setCityOpen(false)} currentCity={city} />
    </>
  )
}

function TabItem({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string
  label: string
  active: boolean
  icon: (props: { className?: string }) => React.ReactNode
}) {
  return (
    <li className='min-w-0'>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-full flex-col items-center justify-center gap-0.5 touch-manipulation',
          active ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
        )}
      >
        <Icon className='size-[22px]' />
        <span className='max-w-full truncate px-1 text-[11px] font-medium leading-tight'>{label}</span>
      </Link>
    </li>
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
