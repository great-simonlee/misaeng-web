'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

import { cn } from '@lib'
import { getCity, replaceCityInPath, type CityId } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { loadEnabledCities } from '@widgets/nyc/CitySelectModal'

const CARD_WIDTH = 280
const VIEWPORT_MARGIN = 16

/** City photo per city (176px squares made from the app's city photos) */
const CITY_PHOTO: Record<CityId, string> = {
  nyc: '/img/cities/nyc.jpg',
  boston: '/img/cities/boston.jpg',
  dc: '/img/cities/dc.jpg',
}

/**
 * Ellieo city switcher: a compact dropdown card under the "NYC ▾" pill (Misaeng keeps CitySelectModal's sheet).
 * One row per open city — round photo (blue ring + check on the current one), name, region line.
 * Menu semantics: arrow keys move, Enter/Space picks, Esc or a click outside closes and returns focus to the pill.
 */
export function EllieoCityMenu({
  open,
  onClose,
  currentCity,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  currentCity: CityId
  /** The pill: clicks on it don't count as "outside", and focus returns to it on close */
  anchorRef: RefObject<HTMLElement | null>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useT('nav')
  const [cities, setCities] = useState<readonly CityId[]>(['nyc', 'boston'])
  const menuRef = useRef<HTMLDivElement>(null)
  /** Card position from the pill: fixed, at least 16px from both viewport edges; caret under the pill's centre */
  const [place, setPlace] = useState<{ left: number; top: number; caret: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const pill = anchorRef.current?.getBoundingClientRect()
      if (!pill) return
      const width = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
      const left = Math.min(Math.max(VIEWPORT_MARGIN, pill.left), window.innerWidth - VIEWPORT_MARGIN - width)
      setPlace({ left, top: pill.bottom + 10, caret: pill.left + pill.width / 2 - left })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    let alive = true
    void loadEnabledCities().then((ids) => {
      if (alive) setCities(ids)
    })
    return () => {
      alive = false
    }
  }, [open])

  // Focus the current city when the menu opens
  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')
    const current = Array.from(items ?? []).find((item) => item.getAttribute('aria-checked') === 'true')
    ;(current ?? items?.[0])?.focus()
  }, [open, cities])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const close = () => {
    onClose()
    anchorRef.current?.focus()
  }

  const select = (city: CityId) => {
    if (city !== currentCity) router.push(replaceCityInPath(pathname, city))
    onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items.at(-1)?.focus()
    }
  }

  return (
    <>
      {/* Phones: a light scrim behind the card (a tap on it closes, like any outside click) */}
      <div aria-hidden className='ellieo-fade-in fixed inset-0 top-14 z-[10000] bg-black/[0.08] sm:hidden' />
      <div
        ref={menuRef}
        role='menu'
        aria-label={t('ellieo.chooseCity')}
        onKeyDown={onKeyDown}
        style={place ? { left: place.left, top: place.top, transformOrigin: `${place.caret}px 0` } : { visibility: 'hidden' }}
        className='ellieo-pop-in fixed z-[10001] w-[17.5rem] max-w-[calc(100vw-2rem)] rounded-[1.5rem] border border-[var(--border)] bg-white px-2 pb-1.5 pt-2 shadow-[0_2px_4px_rgb(20_18_31/0.04),0_20px_44px_-18px_rgb(20_18_31/0.32)]'
      >
        {/* Caret pointing up at the pill */}
        <span
          aria-hidden
          className='absolute -top-[7px] size-3 rotate-45 rounded-[2px] border-l border-t border-[var(--border)] bg-white'
          style={{ left: (place?.caret ?? 40) - 6 }}
        />
        <p className='px-2.5 pb-1 pt-1 text-[12px] font-bold text-[var(--muted)]'>{t('ellieo.chooseCity')}</p>
        <div className='divide-y divide-[var(--border)]'>
          {cities.map((id) => {
            const info = getCity(id)
            const active = id === currentCity
            return (
              <button
                key={id}
                type='button'
                role='menuitemradio'
                aria-checked={active}
                onClick={() => select(id)}
                className='flex h-14 w-full items-center gap-3 rounded-[0.875rem] px-2.5 text-left outline-none transition hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)]'
              >
                <Image
                  src={CITY_PHOTO[id]}
                  alt=''
                  width={40}
                  height={40}
                  className={cn(
                    'size-10 shrink-0 rounded-full object-cover',
                    active && 'ring-[1.5px] ring-[var(--brand)] ring-offset-2 ring-offset-white',
                  )}
                />
                <span className='min-w-0 flex-1'>
                  <span className='block text-[15px] font-semibold leading-tight text-[var(--foreground)]'>{info.name}</span>
                  <span className='block text-[12.5px] leading-tight text-[var(--muted)]'>{info.regions}</span>
                </span>
                {active ? (
                  <>
                    <CheckIcon />
                    <span className='sr-only'>{t('currentCity')}</span>
                  </>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function CheckIcon() {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.4} strokeLinecap='round' strokeLinejoin='round' aria-hidden className='size-5 shrink-0 text-[var(--brand)]'>
      <path d='m5 12.5 4.5 4.5L19 7.5' />
    </svg>
  )
}
