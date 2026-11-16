'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import { useT } from '@lib/i18n/client'
import { EllieoCommunityAvatar } from '@widgets/ellieo/EllieoCommunityAvatar'
import { COMMUNITY_GROUPS, ELLIEO_COMMUNITIES } from '@widgets/ellieo/communities'
import { ChevronRightIcon, StarIcon } from '@widgets/ellieo/icons'

/** Communities tab: every community grouped (Housing / Jobs & Visa / Life) → its community page */
export function EllieoCommunitiesScreen() {
  const t = useT('nav')
  const href = useCityPath()

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-10 pt-5'>
        <h1 className='text-[24px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('ellieo.communitiesTitle')}</h1>
        {COMMUNITY_GROUPS.map((group) => (
          <section key={group} className='mt-6'>
            <h2 className='text-[13px] font-semibold text-[var(--muted)]'>{t(`ellieo.groups.${group}`)}</h2>
            <ul className='mt-1 divide-y divide-[var(--border)]'>
              {ELLIEO_COMMUNITIES.filter((community) => community.group === group).map((community) => (
                <li key={community.key}>
                  <Link href={href(community.path)} className='flex items-center gap-3 py-3'>
                    <EllieoCommunityAvatar community={community} size={40} />
                    <span className='min-w-0 flex-1'>
                      <span className='block text-[16px] font-semibold text-[var(--foreground)]'>
                        {t(`ellieo.communities.${community.key}.name`)}
                      </span>
                      <span className='block truncate text-[13px] text-[var(--muted-foreground)]'>
                        {t(`ellieo.communities.${community.key}.description`)}
                      </span>
                    </span>
                    <ChevronRightIcon className='size-4 shrink-0 text-[var(--muted)]' />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link href={href('/partners')} className='mt-6 flex items-center gap-3 border-t border-[var(--border)] py-4'>
          <span className='inline-flex size-10 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground)]'>
            <StarIcon className='size-5' />
          </span>
          <span className='flex-1 text-[16px] font-semibold text-[var(--foreground)]'>{t('ellieo.partners')}</span>
          <ChevronRightIcon className='size-4 text-[var(--muted)]' />
        </Link>
      </div>
    </div>
  )
}
