'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useCityPath } from '@hooks/useCity'
import { fetchFamily, type FamilyOverview } from '@lib/family/client'
import { useT } from '@lib/i18n/client'

const card =
  'overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'

/**
 * My page entry to 자녀 (parents) / 부모님 (members) — src/screens/nyc/FamilyScreen.tsx. Parents always see it; members
 * only when a parent is linked or a request is waiting. Hidden before supabase/parent_links.sql (503) or on errors.
 */
export function MyPageFamilySection({ isParent }: { isParent: boolean }) {
  const t = useT('me.family')
  const href = useCityPath()
  const [data, setData] = useState<FamilyOverview | null>(null)

  useEffect(() => {
    let alive = true
    fetchFamily()
      .then((value) => alive && setData(value))
      .catch(() => alive && setData(null))
    return () => {
      alive = false
    }
  }, [])

  if (!data) return null
  const parent = data.role === 'parent' || isParent
  if (!parent && data.parents.length === 0 && data.incoming.length === 0) return null
  const line = parent
    ? data.children.length
      ? t('entry.parentLinked', { count: data.children.length })
      : t('entry.parentEmpty')
    : data.incoming.length
      ? t('entry.incoming', { count: data.incoming.length })
      : t('entry.memberLinked', { count: data.parents.length })

  return (
    <section>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {parent ? t('titleParent') : t('titleMember')}
      </h3>
      <Link href={href('/me/family')} className={`${card} flex items-center gap-3 px-5 py-4 touch-manipulation transition active:bg-[#f8f9fb]`}>
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-medium tracking-tight text-[var(--foreground)]'>{line}</span>
          <span className='mt-0.5 block text-[12px] text-[var(--muted)]'>{parent ? t('entry.parentHint') : t('entry.memberHint')}</span>
        </span>
        {data.incoming.length ? <span className='size-2 rounded-full bg-[var(--brand)]' aria-hidden /> : null}
        <span aria-hidden className='text-[var(--muted)]'>›</span>
      </Link>
    </section>
  )
}
