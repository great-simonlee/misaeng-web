'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

import { cn } from '@lib'
import { getCity, replaceCityInPath, type CityId } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { loadEnabledCities } from '@widgets/nyc/CitySelectModal'

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
    <div
      ref={menuRef}
      role='menu'
      aria-label={t('selectCity')}
      onKeyDown={onKeyDown}
      className='absolute left-0 top-full z-[10001] mt-2 w-[17.5rem] max-w-[calc(100vw-2rem)] rounded-[1.5rem] border border-[var(--border)] bg-white p-2 shadow-[0_2px_4px_rgb(20_18_31/0.04),0_20px_44px_-18px_rgb(20_18_31/0.32)]'
    >
      <p className='px-2.5 pb-1.5 pt-1 text-[12px] font-bold text-[var(--muted)]'>{t('selectCity')}</p>
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
            className={cn(
              'flex w-full items-center gap-3 rounded-[1.125rem] px-2.5 py-2 text-left outline-none transition hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)]',
              active && 'bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]',
            )}
          >
            <span className='relative shrink-0'>
              <Image
                src={CITY_PHOTO[id]}
                alt=''
                width={44}
                height={44}
                className={cn('size-11 rounded-full object-cover', active && 'ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--brand-soft)]')}
              />
              {active ? (
                <span aria-hidden className='absolute -bottom-0.5 -right-0.5 flex size-[1.125rem] items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white ring-2 ring-white'>
                  ✓
                </span>
              ) : null}
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block text-[15px] font-semibold text-[var(--foreground)]'>{info.name}</span>
              <span className='block text-[12.5px] text-[var(--muted)]'>{info.regions}</span>
            </span>
            {active ? <span className='sr-only'>{t('currentCity')}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
