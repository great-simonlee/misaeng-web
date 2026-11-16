'use client'

import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { NYC_CATEGORIES } from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'
import { useSupportConfig } from '@lib/support/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { EllieoCityMenu } from '@widgets/ellieo/EllieoCityMenu'
import { EllieoSheet } from '@widgets/ellieo/EllieoSheet'
import {
  BellIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  HomeIcon,
  KeyIcon,
  PassportIcon,
  GlobeIcon,
  PlusIcon,
  StarIcon,
} from '@widgets/ellieo/icons'
import { ELLIEO_BOARDS } from '@widgets/ellieo/nav'

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
  const { user, loading, avatarURL, displayName, isMisaengUser } = useEllieoViewer()
  const supportConfig = useSupportConfig()
  const [cityOpen, setCityOpen] = useState(false)
  const [sheet, setSheet] = useState<'compose' | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const cityPillRef = useRef<HTMLButtonElement>(null)

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
  const closeCity = useCallback(() => setCityOpen(false), [])
  const isActive = (target: string) => pathname === target || pathname.startsWith(`${target}/`)
  const home = href()
  const signedIn = !loading && Boolean(user)
  const gated = (target: string) => (signedIn ? target : cityLoginPath(city, target))
  const loginHref = cityLoginPath(city, pathname)
  const inboxHref = href('/me/inquiries')
  const accountLinks = [
    ...ACCOUNT_LINKS,
    ...(supportConfig?.inquiries ? [{ path: '/me/inquiries', key: 'inquiries', exact: false } as const] : []),
    ...(isMisaengUser ? [{ path: '/team/credit-reviews', key: 'creditReviews', exact: false } as const] : []),
  ].map((item) => ({ ...item, href: href(item.path), label: t(`account.${item.key}`) }))
  // Pages that lived in the Explore sheet: points guide and the Ellieo intro
  const extraLinks = [
    { href: href('/credit'), label: t('ellieo.menu.points'), icon: StarIcon },
    { href: href('/about'), label: t('ellieo.menu.about'), icon: GlobeIcon },
  ]
  const boards = ELLIEO_BOARDS.filter((board) => board.available)
  const composeBoards = boards.map((board) => ({
    ...board,
    postHref: href(NYC_CATEGORIES.find((item) => item.id === board.id)!.postHref),
  }))

  const housingHref = href('/housing')
  const visaHref = href('/status')
  const jobsHref = href('/job-review')
  const companiesHref = href('/companies')
  // Visa: the merged board and its legacy routes (cpt-opt, visa, green-card redirect there)
  const visaActive = ['/status', '/cpt-opt', '/visa', '/green-card'].some((path) => isActive(href(path)))
  const tabs = [
    { key: 'home', label: t('ellieo.tabs.home'), icon: HomeIcon, href: home, active: pathname === home },
    { key: 'housing', label: t('ellieo.tabs.housing'), icon: KeyIcon, href: housingHref, active: isActive(housingHref) },
    { key: 'post' },
    { key: 'visa', label: t('ellieo.short.status'), icon: PassportIcon, href: visaHref, active: visaActive },
    { key: 'jobs', label: t('ellieo.tabs.jobs'), icon: BriefcaseIcon, href: jobsHref, active: isActive(jobsHref) || isActive(companiesHref) },
  ] as const

  return (
    <>
      <header className='fixed inset-x-0 top-0 z-[10000] border-b border-[var(--border)] bg-white'>
        <div className='mx-auto flex h-14 w-full max-w-[63rem] min-w-0 items-center gap-2 px-4 sm:h-16'>
          <Link href={home} className='flex shrink-0 items-center gap-2 touch-manipulation' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
            <Image
              src={BRAND_CONFIG.assets.banner.src}
              alt={BRAND_CONFIG.name}
              width={BRAND_CONFIG.assets.banner.width}
              height={BRAND_CONFIG.assets.banner.height}
              className='h-[22px] w-auto sm:h-6'
              priority
            />
          </Link>
          <div className='relative ml-1'>
            <button
              ref={cityPillRef}
              type='button'
              onClick={() => setCityOpen((value) => !value)}
              className='inline-flex h-8 items-center gap-1 rounded-full bg-[var(--surface)] px-3 text-[13px] font-bold text-[var(--foreground)] touch-manipulation transition hover:bg-[var(--border)]'
              aria-haspopup='menu'
              aria-expanded={cityOpen}
              aria-label={t('selectCity')}
            >
              {cityInfo.shortLabel}
              <ChevronDownIcon className={cn('size-3.5 transition', cityOpen && 'rotate-180')} />
            </button>
            <EllieoCityMenu open={cityOpen} onClose={closeCity} currentCity={city} anchorRef={cityPillRef} />
          </div>
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
                    <div className='my-1.5 h-px bg-[var(--border)]' />
                    {extraLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role='menuitem'
                        className={cn(
                          'flex h-10 items-center gap-2 rounded-xl px-2.5 text-[14px] font-medium transition hover:bg-[var(--surface)]',
                          isActive(item.href) ? 'font-bold text-[var(--brand)]' : 'text-[var(--foreground)]',
                        )}
                      >
                        <item.icon className='size-[18px] text-[var(--muted-foreground)]' />
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
                    className='inline-flex size-[3.25rem] -translate-y-1 items-center justify-center rounded-full bg-[var(--ellieo-lime)] text-[var(--foreground)] shadow-[0_8px_20px_-8px_rgba(31,94,255,0.45)] ring-4 ring-white transition hover:scale-[1.04] active:scale-95 lg:translate-y-0 lg:ring-0'
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
                <Link href={tab.href} aria-current={tab.active ? 'page' : undefined} className={className}>
                  {body}
                </Link>
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
                <EllieoIconBadge icon={board.icon} size={44} />
                <span className='text-[15px] font-bold leading-tight text-[var(--foreground)]'>
                  {board.id === 'housing' ? t('ellieo.compose.housing') : t(`ellieo.short.${board.id}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </EllieoSheet>


    </>
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
