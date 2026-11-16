'use client'

import { EllieoCityCard, EllieoSafetyCard } from '@widgets/ellieo/EllieoSidebarCards'

/** Right rail on Ellieo board and detail pages (desktop) */
export function EllieoBoardRail() {
  return (
    <aside className='flex min-w-0 flex-col gap-4 pt-4'>
      <EllieoCityCard />
      <EllieoSafetyCard />
    </aside>
  )
}
