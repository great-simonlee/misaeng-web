'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useEllieoViewer } from '@hooks/useEllieoViewer'
import { useCity, useCityPath } from '@hooks/useCity'
import { cityLoginPath } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import { EllieoCommunityAvatar } from '@widgets/ellieo/EllieoCommunityAvatar'
import { communityListPage } from '@widgets/ellieo/communities'
import { ComposeIcon } from '@widgets/ellieo/icons'

/**
 * Community page banner (docs/design/ellieo-community.md): 56px band tinted with the community color, 56px avatar
 * overlapping it, e/Name, one-line description and a "Post" pill when the community takes posts.
 */
export function EllieoCommunityBanner() {
  const pathname = usePathname()
  const href = useCityPath()
  const city = useCity()
  const t = useT('nav')
  const { user, loading } = useEllieoViewer()
  const community = communityListPage(pathname, href)
  if (!community) return null

  const write = community.writePath ? href(community.writePath) : null
  return (
    <section className='w-full bg-white'>
      <div aria-hidden className='h-14' style={{ background: `${community.color}1A` }} />
      <div className='mx-auto w-full max-w-[52rem] px-4'>
        <div className='-mt-7 flex items-end gap-3'>
          <span className='rounded-full ring-4 ring-white'>
            <EllieoCommunityAvatar community={community} size={56} />
          </span>
          <span className='flex-1' />
          {write ? (
            <Link
              href={!loading && !user ? cityLoginPath(city, write) : write}
              className='mb-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white transition hover:bg-[var(--brand-hover)]'
            >
              <ComposeIcon className='size-4' strokeWidth={2} />
              {t('ellieo.post')}
            </Link>
          ) : null}
        </div>
        <h1 className='mt-2 text-[20px] font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)]'>
          {t(`ellieo.communities.${community.key}.name`)}
        </h1>
        <p className='mt-0.5 text-[13.5px] text-[var(--muted-foreground)]'>{t(`ellieo.communities.${community.key}.description`)}</p>
      </div>
    </section>
  )
}
