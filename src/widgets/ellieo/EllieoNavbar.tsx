'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_CATEGORIES } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import { useSupportConfig } from '@lib/support/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { CitySelectModal } from '@widgets/nyc/CitySelectModal'
import { EllieoSheet } from '@widgets/ellieo/EllieoSheet'
import {
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CompassIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
  UserIcon,
} from '@widgets/ellieo/icons'
import { BOARD_EMOJI, ELLIEO_BOARDS } from '@widgets/ellieo/nav'

/** Account links (labels: nav.account.<key>) */
const ACCOUNT_LINKS = [
  { path: '/me', key: 'me', exact: true },
  { path: '/me/posts', key: 'myPosts', exact: false },
  { path: '/me/likes', key: 'myLikes', exact: false },
] as const

/**
 * Ellieo shell (docs/design/ellieo-social.md): white top bar (logo · city · language · inbox · avatar) and a
 * bottom tab bar on every screen size (Home · Explore · + · Inbox · Me). + opens the board picker,
 * Explore opens every board and page. Same destinations as the Misaeng header (NycNavbar), different layout.
 * The top bar keeps the shared height (h-14 / sm:h-16) so sticky offsets in shared screens still line up.
 */
export function EllieoNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const city = useCity()
  const cityInfo = useCityInfo()
  const href = useCityPath()
  const t = useT('nav')
  const tc = useT('community')
  const { user, loading, avatarURL, displayName, isMisaengUser } = useEllieoViewer()
  const supportConfig = useSupportConfig()
  const [cityOpen, setCityOpen] = useState(false)
  const [sheet, setSheet] = useState<'compose' | 'explore' | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const [navPath, setNavPath] = useState(pathname)
  if (pathname !== navPath) {
    setNavPath(pathname)
    setAccountOpen(false)
    setCityOpen(false)
    setSheet(null)
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

  const closeSheet = useCallback(() => setSheet(null), [])
  const isActive = (target: string) => pathname === target || pathname.startsWith(`${target}/`)
  const home = href()
  const signedIn = !loading && Boolean(user)
  const gated = (target: string) => (signedIn ? target : cityLoginPath(city, target))
  const loginHref = cityLoginPath(city, pathname)
  const inboxHref = href('/me/inquiries')
  const meHref = href('/me')
  const accountLinks = [
    ...ACCOUNT_LINKS,
    ...(supportConfig?.inquiries ? [{ path: '/me/inquiries', key: 'inquiries', exact: false } as const] : []),
    ...(isMisaengUser ? [{ path: '/team/credit-reviews', key: 'creditReviews', exact: false } as const] : []),
  ].map((item) => ({ ...item, href: href(item.path), label: t(`account.${item.key}`) }))
  const boards = ELLIEO_BOARDS.filter((board) => board.available)
  const composeBoards = boards.map((board) => ({
    ...board,
    postHref: href(NYC_CATEGORIES.find((item) => item.id === board.id)!.postHref),
  }))

  const tabs = [
    { key: 'home', label: t('ellieo.tabs.home'), icon: HomeIcon, href: home, active: pathname === home },
    { key: 'explore', label: t('ellieo.tabs.explore'), icon: CompassIcon, onClick: () => setSheet('explore'), active: sheet === 'explore' },
    { key: 'post' },
    { key: 'inbox', label: t('ellieo.tabs.inbox'), icon: InboxIcon, href: gated(inboxHref), active: isActive(inboxHref) },
    { key: 'me', label: t('ellieo.tabs.me'), icon: UserIcon, href: gated(meHref), active: pathname === meHref || (isActive(meHref) && !isActive(inboxHref)) },
  ] as const

  return (
    <>
      <header className='fixed inset-x-0 top-0 z-[10000] border-b border-[var(--border)] bg-white'>
        <div className='mx-auto flex h-14 w-full max-w-[63rem] min-w-0 items-center gap-2 px-4 sm:h-16'>
          <Link href={home} className='flex shrink-0 items-center gap-2 touch-manipulation' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
            <EllieoMark />
            <span className='text-[21px] font-extrabold tracking-[-0.04em] text-[var(--foreground)]'>ellieo</span>
          </Link>
          <button
            type='button'
            onClick={() => setCityOpen(true)}
            className='ml-1 inline-flex h-8 items-center gap-1 rounded-full bg-[var(--surface)] px-3 text-[13px] font-bold text-[var(--foreground)] touch-manipulation transition hover:bg-[var(--border)]'
            aria-haspopup='dialog'
            aria-expanded={cityOpen}
            aria-label={t('selectCity')}
          >
            {cityInfo.shortLabel}
            <ChevronDownIcon className='size-3.5' />
          </button>
          <span className='flex-1' aria-hidden />

          <div className='hidden sm:block'>
            <LanguageMenu variant='segmented' />
          </div>
          {signedIn ? (
            <>
              <Link
                href={inboxHref}
                aria-label={t('ellieo.notifications')}
                className='inline-flex size-10 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface)]'
              >
                <BellIcon className='size-[22px]' />
              </Link>
              <div ref={accountRef} className='relative'>
                <button
                  type='button'
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-haspopup='menu'
                  aria-expanded={accountOpen}
                  aria-label={accountOpen ? t('closeAccountMenu') : t('openAccountMenu')}
                  className='inline-flex size-10 items-center justify-center rounded-full transition hover:bg-[var(--surface)]'
                >
                  <EllieoAvatar photoURL={avatarURL} name={displayName} size={32} />
                </button>
                {accountOpen ? (
                  <div
                    role='menu'
                    aria-label={t('accountMenu')}
                    className='absolute right-0 top-full mt-2 min-w-[14rem] rounded-[1.25rem] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-lg)]'
                  >
                    <div className='flex items-center gap-2.5 px-2.5 pb-2.5 pt-1.5'>
                      <EllieoAvatar photoURL={avatarURL} name={displayName} size={32} />
                      <span className='min-w-0 truncate text-[14px] font-bold text-[var(--foreground)]'>
                        {displayName || t('profileAltFallback')}
                      </span>
                    </div>
                    {accountLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role='menuitem'
                        className={cn(
                          'flex h-10 items-center rounded-xl px-2.5 text-[14px] font-medium transition hover:bg-[var(--surface)]',
                          (item.exact ? pathname === item.href : isActive(item.href))
                            ? 'font-bold text-[var(--brand)]'
                            : 'text-[var(--foreground)]',
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : !loading ? (
            <Link
              href={loginHref}
              className='inline-flex h-9 items-center rounded-full bg-[var(--foreground)] px-4 text-[14px] font-bold text-white transition hover:bg-black'
            >
              {t('ellieo.login')}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Bottom tab bar: every width (a floating pill from 1024px) */}
      <nav
        aria-label={t('menuAria', { city: cityInfo.shortLabel })}
        className='fixed inset-x-0 bottom-0 z-[10000] border-t border-[var(--border)] bg-white pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:w-[27.5rem] lg:-translate-x-1/2 lg:rounded-full lg:border lg:pb-0 lg:shadow-[var(--shadow-lg)]'
      >
        <ul className='mx-auto grid h-[4.25rem] max-w-[30rem] grid-cols-5 items-center px-2 lg:h-16'>
          {tabs.map((tab) => {
            if (tab.key === 'post') {
              return (
                <li key='post' className='flex justify-center'>
                  <button
                    type='button'
                    onClick={() => setSheet('compose')}
                    aria-label={t('ellieo.tabs.post')}
                    aria-expanded={sheet === 'compose'}
                    className='inline-flex size-[3.25rem] -translate-y-1 items-center justify-center rounded-full bg-[var(--ellieo-lime)] text-[var(--foreground)] shadow-[0_8px_20px_-8px_rgba(124,92,255,0.55)] ring-4 ring-white transition hover:scale-[1.04] active:scale-95 lg:translate-y-0 lg:ring-0'
                  >
                    <PlusIcon className='size-6' strokeWidth={2.5} />
                  </button>
                </li>
              )
            }
            const Icon = tab.icon
            const body = (
              <>
                <Icon className='size-6' strokeWidth={tab.active ? 2.25 : 1.75} />
                <span className='text-[11px] font-semibold leading-none'>{tab.label}</span>
              </>
            )
            const className = cn(
              'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl touch-manipulation transition',
              tab.active ? 'text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
            )
            return (
              <li key={tab.key}>
                {'href' in tab ? (
                  <Link href={tab.href} aria-current={tab.active ? 'page' : undefined} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button type='button' onClick={tab.onClick} aria-expanded={tab.active} className={className}>
                    {body}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <EllieoSheet
        open={sheet === 'compose'}
        onClose={closeSheet}
        title={t('ellieo.compose.title')}
        subtitle={t('ellieo.compose.subtitle')}
        closeLabel={t('ellieo.close')}
      >
        <ul className='grid grid-cols-2 gap-2.5'>
          {composeBoards.map((board) => (
            <li key={board.id}>
              <button
                type='button'
                onClick={() => {
                  setSheet(null)
                  router.push(gated(board.postHref))
                }}
                className='flex w-full flex-col items-start gap-2 rounded-[1.25rem] bg-[var(--surface)] p-4 text-left transition hover:bg-[var(--border)]'
              >
                <span aria-hidden className='text-[26px] leading-none'>{BOARD_EMOJI[board.id]}</span>
                <span className='text-[15px] font-bold leading-tight text-[var(--foreground)]'>
                  {board.id === 'housing' ? t('ellieo.compose.housing') : t(`ellieo.short.${board.id}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </EllieoSheet>

      <EllieoSheet open={sheet === 'explore'} onClose={closeSheet} title={t('ellieo.explore.title')} closeLabel={t('ellieo.close')}>
        <p className='text-[12px] font-bold uppercase tracking-[0.04em] text-[var(--muted)]'>{t('ellieo.explore.boards')}</p>
        <ul className='mt-2 grid gap-1'>
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={href(board.path)}
                className='flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-[var(--surface)]'
              >
                <span aria-hidden className='inline-flex size-10 items-center justify-center rounded-full bg-[var(--surface)] text-[20px]'>
                  {BOARD_EMOJI[board.id]}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[15px] font-bold text-[var(--foreground)]'>{tc(`categories.${board.id}.title`)}</span>
                </span>
                <ChevronRightIcon className='size-4 text-[var(--muted)]' />
              </Link>
            </li>
          ))}
        </ul>
        <p className='mt-5 text-[12px] font-bold uppercase tracking-[0.04em] text-[var(--muted)]'>{t('ellieo.explore.more')}</p>
        <ul className='mt-2 flex flex-wrap gap-2'>
          {[
            { label: t('ellieo.explore.companies'), path: '/companies' },
            { label: t('ellieo.explore.postings'), path: '/companies/postings' },
            { label: t('ellieo.explore.partners'), path: '/partners' },
            { label: t('ellieo.explore.points'), path: '/credit' },
            { label: t('ellieo.explore.about'), path: '/about' },
          ].map((item) => (
            <li key={item.path}>
              <Link
                href={href(item.path)}
                className='inline-flex h-9 items-center rounded-full bg-[var(--surface)] px-3.5 text-[14px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]'
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className='mt-5 flex items-center justify-between rounded-2xl bg-[var(--surface)] px-4 py-3 sm:hidden'>
          <span className='text-[14px] font-bold text-[var(--foreground)]'>{t('ellieo.language')}</span>
          <LanguageMenu variant='segmented' />
        </div>
      </EllieoSheet>

      <CitySelectModal open={cityOpen} onClose={() => setCityOpen(false)} currentCity={city} />
    </>
  )
}

/** Logo mark: violet rounded square with a lowercase "e" and a lime dot */
export function EllieoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 32 32' aria-hidden>
      <rect width='32' height='32' rx='10' fill='#7c5cff' />
      <text x='15' y='22.5' textAnchor='middle' fontSize='20' fontWeight='800' fill='#fff' fontFamily='var(--font-ellieo), system-ui, sans-serif'>
        e
      </text>
      <circle cx='25' cy='7.5' r='3' fill='#c6f432' />
    </svg>
  )
}

export function EllieoAvatar({ photoURL, name, size = 40 }: { photoURL?: string | null; name?: string | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  const show = Boolean(photoURL) && failed !== photoURL
  return (
    <span
      className='inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] font-bold text-[var(--brand)]'
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- external profile URL
        <img
          src={photoURL!}
          alt=''
          width={size}
          height={size}
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
