import Image from 'next/image'

import { cn } from '@lib'
import { brandConfig } from '@lib/brand'
import { APP_STORE_URL, PLAY_STORE_URL } from '@lib/constants/app-store'
import { AppStoreBadge, GooglePlayBadge } from '@components/StoreBadges'
import { MISAENG_APP_STORE_URL, MISAENG_PLAY_STORE_URL } from '@widgets/nyc/MisaengStoreButtons'

/** Misaeng LLC의 두 생활 플랫폼 (회사 사이트 홈·모바일 앱 페이지) — 미생: 한국어·영어, 엘리오: 베트남어·영어 */
export const BRAND_APPS = [
  {
    id: 'misaeng',
    name: 'Misaeng',
    icon: '/img/app_icon.png',
    languages: 'Korean · English',
    tagline: 'The everyday-life platform for Koreans in the U.S.',
    description:
      'A community for students and professionals in New York City and Boston, with rentals and real estate brokerage through New York–licensed agents in NYC, roommate matching, jobs and visa info, and a used-goods marketplace.',
    accent: '#F64310',
    /** Small text on white: darker than the brand colour for 4.5:1 contrast */
    textAccent: '#C2380C',
    appStore: MISAENG_APP_STORE_URL,
    playStore: MISAENG_PLAY_STORE_URL,
    site: { href: '/nyc', label: 'misaeng.com/nyc' },
  },
  {
    id: 'ellieo',
    name: 'Ellieo',
    icon: '/img/ellieo_logo.png',
    languages: 'Vietnamese · English',
    tagline: 'The everyday-life platform for Vietnamese in the U.S.',
    description:
      'Rentals and real estate brokerage through New York–licensed agents, roommate matching, and a community for Vietnamese students and professionals in New York City.',
    accent: '#2f6df6',
    textAccent: '#2455c4',
    appStore: APP_STORE_URL,
    playStore: PLAY_STORE_URL,
    site: { href: brandConfig('ellieo').productionUrl, label: 'ellieo.com' },
  },
] as const

export type BrandApp = (typeof BRAND_APPS)[number]

/** 앱 아이콘 + 이름 + 언어 + 소개 + 스토어 배지 카드 */
export function BrandAppCard({ app, className, headingLevel = 3 }: { app: BrandApp; className?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article
      id={app.id}
      className={cn(
        'flex scroll-mt-24 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-left shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] sm:p-7',
        className,
      )}
    >
      <div className='flex items-center gap-3'>
        <Image
          src={app.icon}
          alt=''
          width={56}
          height={56}
          className='size-12 shrink-0 rounded-[14px] border border-black/5 bg-white object-contain sm:size-14'
          aria-hidden
        />
        <div className='min-w-0'>
          <Heading className='text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl'>{app.name}</Heading>
          <p className='text-xs font-semibold sm:text-sm' style={{ color: app.textAccent }}>
            {app.languages}
          </p>
        </div>
      </div>
      <p className='mt-4 text-base font-semibold text-[var(--foreground)] sm:text-lg'>{app.tagline}</p>
      <p className='mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base'>
        {app.description}
      </p>
      <div className='mt-5 flex flex-wrap items-center gap-2.5'>
        <AppStoreBadge href={app.appStore} label={`Download ${app.name} on the App Store`} />
        <GooglePlayBadge href={app.playStore} label={`Get ${app.name} on Google Play`} />
      </div>
      <a
        href={app.site.href}
        className='mt-4 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80'
        style={{ color: app.textAccent }}
      >
        Visit {app.site.label}
        <span aria-hidden>→</span>
      </a>
    </article>
  )
}

export function BrandAppCards({ className, headingLevel }: { className?: string; headingLevel?: 2 | 3 }) {
  return (
    <div className={cn('grid gap-4 sm:gap-6 md:grid-cols-2', className)}>
      {BRAND_APPS.map((app) => (
        <BrandAppCard key={app.id} app={app} headingLevel={headingLevel} />
      ))}
    </div>
  )
}
