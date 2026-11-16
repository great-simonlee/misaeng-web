'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityInfo, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { BRAND_CONFIG } from '@lib/brand'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { useSupportConfig } from '@lib/support/client'
import { LanguageMenu } from '@widgets/LanguageMenu'
import { EllieoCityMenu } from '@widgets/ellieo/EllieoCityMenu'
import { EllieoCommunityAvatar } from '@widgets/ellieo/EllieoCommunityAvatar'
import { EllieoSheet } from '@widgets/ellieo/EllieoSheet'
import { COMMUNITY_GROUPS, ELLIEO_COMMUNITIES, communityForPath } from '@widgets/ellieo/communities'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ComposeIcon,
  GlobeIcon,
  GridIcon,
  HomeIcon,
  InboxIcon,
  StarIcon,
  UserIcon,
} from '@widgets/ellieo/icons'

/** Account links (labels: nav.account.<key>) */
const ACCOUNT_LINKS = [
  { path: '/me', key: 'me', exact: true },
  { path: '/me/posts', key: 'myPosts', exact: false },
  { path: '/me/likes', key: 'myLikes', exact: false },
] as const

/**
 * Ellieo shell, community design (docs/design/ellieo-community.md):
 * - header: logo · city pill · (desktop) language · inbox · avatar / Log in
 * - phones/tablets: plain bottom bar Home · Communities · Write · Inbox · Me (Write opens "Post to…")
 * - desktop (≥1024px): left sidebar with Home + the communities by group; no bottom bar
 * The header keeps the shared height (h-14 / sm:h-16) so sticky offsets in shared screens still line up.
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
  const [composeOpen, setComposeOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const cityPillRef = useRef<HTMLButtonElement>(null)

  const [navPath, setNavPath] = useState(pathname)
  if (pathname !== navPath) {
    setNavPath(pathname)
    setAccountOpen(false)
    setCityOpen(false)
    setComposeOpen(false)
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

  const closeCompose = useCallback(() => setComposeOpen(false), [])
  const closeCity = useCallback(() => setCityOpen(false), [])
  const isActive = (target: string) => pathname === target || pathname.startsWith(`${target}/`)
  const home = href()
  const signedIn = !loading && Boolean(user)
  const gated = (target: string) => (signedIn ? target : cityLoginPath(city, target))
  const loginHref = cityLoginPath(city, pathname)
  const inboxHref = href('/me/inquiries')
  const meHref = href('/me')
  const communitiesHref = href('/communities')
  const accountLinks = [
    ...ACCOUNT_LINKS,
    ...(supportConfig?.inquiries ? [{ path: '/me/inquiries', key: 'inquiries', exact: false } as const] : []),
    ...(isMisaengUser ? [{ path: '/team/credit-reviews', key: 'creditReviews', exact: false } as const] : []),
  ].map((item) => ({ ...item, href: href(item.path), label: t(`account.${item.key}`) }))
  const extraLinks = [
    { href: href('/credit'), label: t('ellieo.menu.points'), icon: StarIcon },
    { href: href('/about'), label: t('ellieo.menu.about'), icon: GlobeIcon },
  ]
  const currentCommunity = communityForPath(pathname, href)
  const writable = ELLIEO_COMMUNITIES.filter((community) => community.writePath)
  const inboxActive = isActive(inboxHref)
  const meActive = !inboxActive && isActive(meHref)
  const communitiesActive = isActive(communitiesHref) || Boolean(currentCommunity)

  const bar = [
    { key: 'home', label: t('ellieo.bar.home'), icon: HomeIcon, href: home, active: pathname === home },
    { key: 'communities', label: t('ellieo.bar.communities'), icon: GridIcon, href: communitiesHref, active: communitiesActive },
    { key: 'write', label: t('ellieo.bar.write'), icon: ComposeIcon, href: null, active: composeOpen },
    { key: 'inbox', label: t('ellieo.bar.inbox'), icon: InboxIcon, href: gated(inboxHref), active: inboxActive },
    { key: 'me', label: t('ellieo.bar.me'), icon: UserIcon, href: gated(meHref), active: meActive },
  ] as const

  return (
    <>
      <header className='fixed inset-x-0 top-0 z-[10000] border-b border-[var(--border)] bg-white'>
        <div className='flex h-14 w-full min-w-0 items-center gap-2 px-4 sm:h-16 lg:px-5'>
          <Link href={home} className='flex shrink-0 items-center gap-2 touch-manipulation' aria-label={t('homeAria', { city: cityInfo.shortLabel })}>
            <Image
              src={BRAND_CONFIG.assets.banner.src}
              alt={BRAND_CONFIG.name}
              width={BRAND_CONFIG.assets.banner.width}
              height={BRAND_CONFIG.assets.banner.height}
              sizes='120px'
              className='h-[22px] w-auto sm:h-6'
              priority
            />
          </Link>
          <div className='relative ml-1'>
            <button
              ref={cityPillRef}
              type='button'
              onClick={() => setCityOpen((value) => !value)}
              className='inline-flex h-8 items-center gap-1 rounded-full bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[var(--border)]'
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
            <div className='hidden items-center gap-1 lg:flex'>
              <Link
                href={inboxHref}
                aria-label={t('ellieo.bar.inbox')}
                className='inline-flex size-10 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface)]'
              >
                <InboxIcon className='size-[22px]' />
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
                    className='absolute right-0 top-full mt-2 min-w-[14rem] rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-lg)]'
                  >
                    <div className='flex items-center gap-2.5 px-2.5 pb-2.5 pt-1.5'>
                      <EllieoAvatar photoURL={avatarURL} name={displayName} size={32} />
                      <span className='min-w-0 truncate text-[14px] font-semibold text-[var(--foreground)]'>
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
                            ? 'font-semibold text-[var(--brand)]'
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
                        className='flex h-10 items-center gap-2 rounded-xl px-2.5 text-[14px] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]'
                      >
                        <item.icon className='size-[18px] text-[var(--muted-foreground)]' />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : !loading ? (
            <Link
              href={loginHref}
              className='inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
            >
              {t('ellieo.login')}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Desktop: left sidebar — Home + communities by group */}
      <nav
        aria-label={t('ellieo.communitiesTitle')}
        className='fixed bottom-0 left-0 top-16 z-[9000] hidden w-60 overflow-y-auto border-r border-[var(--border)] bg-white px-3 py-4 lg:block'
      >
        <Link
          href={home}
          aria-current={pathname === home ? 'page' : undefined}
          className={cn(
            'flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition',
            pathname === home ? 'bg-[var(--surface)] text-[var(--foreground)]' : 'text-[var(--foreground)] hover:bg-[var(--surface)]',
          )}
        >
          <HomeIcon className='size-5' />
          {t('ellieo.sidebarHome')}
        </Link>
        {COMMUNITY_GROUPS.map((group) => (
          <div key={group} className='mt-4 border-t border-[var(--border)] pt-4'>
            <p className='px-3 text-[12px] font-semibold text-[var(--muted)]'>{t(`ellieo.groups.${group}`)}</p>
            <ul className='mt-1'>
              {ELLIEO_COMMUNITIES.filter((community) => community.group === group).map((community) => {
                const active = currentCommunity?.key === community.key
                return (
                  <li key={community.key}>
                    <Link
                      href={href(community.path)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] transition',
                        active ? 'bg-[var(--surface)] font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--foreground)] hover:bg-[var(--surface)]',
                      )}
                    >
                      <EllieoCommunityAvatar community={community} size={24} />
                      <span className='truncate'>{t(`ellieo.communities.${community.key}.name`)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <div className='mt-4 border-t border-[var(--border)] pt-4'>
          <Link href={href('/partners')} className='flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--surface)]'>
            <StarIcon className='size-5' />
            {t('ellieo.partners')}
          </Link>
        </div>
      </nav>

      {/* Phones/tablets: plain bottom bar */}
      <nav
        aria-label={t('menuAria', { city: cityInfo.shortLabel })}
        className='fixed inset-x-0 bottom-0 z-[10000] border-t border-[var(--border)] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden'
      >
        <ul className='mx-auto grid h-14 max-w-[40rem] grid-cols-5'>
          {bar.map((item) => {
            const Icon = item.icon
            const className = cn(
              'flex h-full w-full flex-col items-center justify-center gap-1 touch-manipulation',
              item.active ? 'text-[var(--brand)]' : 'text-[var(--muted-foreground)]',
            )
            const body = (
              <>
                <Icon className='size-6' strokeWidth={item.active ? 2.1 : 1.8} />
                <span className='text-[10.5px] font-medium leading-none'>{item.label}</span>
              </>
            )
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link href={item.href} aria-current={item.active ? 'page' : undefined} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button type='button' onClick={() => setComposeOpen(true)} aria-expanded={composeOpen} className={className}>
                    {body}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <EllieoSheet
        open={composeOpen}
        onClose={closeCompose}
        title={t('ellieo.postTo')}
        subtitle={t('ellieo.postToSubtitle')}
        closeLabel={t('ellieo.close')}
      >
        <ul className='mt-2 divide-y divide-[var(--border)]'>
          {writable.map((community) => (
            <li key={community.key}>
              <button
                type='button'
                onClick={() => {
                  setComposeOpen(false)
                  router.push(gated(href(community.writePath!)))
                }}
                className='flex w-full items-center gap-3 py-3 text-left'
              >
                <EllieoCommunityAvatar community={community} size={36} />
                <span className='min-w-0 flex-1'>
                  <span className='block text-[15px] font-semibold text-[var(--foreground)]'>
                    {t(`ellieo.communities.${community.key}.name`)}
                  </span>
                  <span className='block truncate text-[13px] text-[var(--muted-foreground)]'>
                    {t(`ellieo.communities.${community.key}.description`)}
                  </span>
                </span>
                <ChevronRightIcon className='size-4 text-[var(--muted)]' />
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
