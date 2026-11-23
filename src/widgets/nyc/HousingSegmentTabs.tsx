'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'

/**
 * 하우징 = 렌트 + 룸메이트·서블렛, like the app's Housing tab (owner 11-23). Misaeng web only: /housing and /roommate
 * stay separate pages; this switch on top of both makes them one section (the navbar has a single 하우징 link).
 */
export function HousingSegmentTabs({ active, className }: { active: 'rent' | 'roommate'; className?: string }) {
  const t = useT('housing')
  const href = useCityPath()
  const tabs = [
    { id: 'rent', href: href('/housing'), label: t('segments.rent') },
    { id: 'roommate', href: href('/roommate'), label: t('segments.roommate') },
  ] as const
  return (
    <nav aria-label={t('segments.aria')} className={cn('inline-flex rounded-full bg-white p-1 ring-1 ring-[var(--card-ring)]', className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={cn(
            'inline-flex h-9 items-center rounded-full px-4 text-[14px] font-semibold transition touch-manipulation',
            active === tab.id ? 'bg-[var(--foreground)] text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
