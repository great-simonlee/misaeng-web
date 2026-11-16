import Link from 'next/link'

import { EllieoAppIcon } from '@widgets/ellieo/EllieoAppIcon'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import { BagIcon, BellIcon, BowlIcon, BriefcaseIcon, ChatIcon, GridIcon, HeartIcon, HomeIcon, PlaneIcon } from '@widgets/ellieo/icons'

/**
 * Ellieo app page (ellieo.com/mobile-app), social-feed design. The app isn't in the stores yet: no download
 * buttons until APP_LAUNCHED is true, and no claims beyond what ellieo.com already does.
 * English only, like the other pages under the (corporate) layout.
 */
const APP_LAUNCHED = false

const FEATURES = [
  { icon: HomeIcon, title: 'Housing', body: 'Rentals and rooms with clear prices, perks and move-in dates. Ask about a listing in one tap.' },
  { icon: PlaneIcon, title: 'Visa', body: 'OPT, CPT and green card timelines, shared step by step by people who just went through it.' },
  { icon: BriefcaseIcon, title: 'Jobs', body: 'Interview reviews, company pages and internship / new grad postings.' },
  { icon: ChatIcon, title: 'Ask & Talk', body: 'Ask anything, anonymously or with your nickname.' },
  { icon: BowlIcon, title: 'Food', body: 'Places members actually tried, with photos and a map.' },
  { icon: BellIcon, title: 'Alerts', body: 'Replies to your posts and answers to your listing questions, right on your phone.' },
] as const

const SAMPLE_FEED = [
  { name: 'minh.opt', school: 'Baruch', tag: PlaneIcon, title: 'OPT approved in 62 days', likes: 24 },
  { name: 'phoholic', school: 'Columbia', tag: BowlIcon, title: 'Best phở near campus?', likes: 57 },
] as const

export function MobileAppScreen() {
  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-12 pt-6'>
        {/* Hero */}
        <section className='relative overflow-hidden rounded-[1.75rem] bg-[var(--brand)] px-5 pb-6 pt-6 text-white sm:px-7'>
          <span aria-hidden className='absolute -right-8 -top-10 size-36 rounded-full bg-white/10' />
          <div className='relative flex items-center gap-3'>
            <EllieoAppIcon size={56} className='ring-2 ring-white/30' />
            <span className='rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-bold'>Coming soon</span>
          </div>
          <h1 className='relative mt-4 text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-[36px]'>
            Ellieo, in your pocket
          </h1>
          <p className='relative mt-2 max-w-[30rem] text-[15px] leading-relaxed text-white/85'>
            The Ellieo app for iPhone and Android is on its way: the same verified community for housing, visas, jobs
            and everyday life in the US — with alerts when someone replies.
          </p>
          <div className='relative mt-5 flex flex-wrap gap-2'>
            {APP_LAUNCHED ? null : (
              <Link
                href='/nyc/login?mode=signup'
                className='inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-bold text-[var(--brand)] transition hover:bg-white/90'
              >
                Join on the web now
              </Link>
            )}
            <Link
              href='/nyc'
              className='inline-flex h-12 items-center rounded-full bg-white/15 px-6 text-[15px] font-bold text-white transition hover:bg-white/25'
            >
              Open ellieo.com
            </Link>
          </div>
        </section>

        {/* Phone preview: the feed as it looks in the app */}
        <section aria-hidden className='mt-6 flex justify-center'>
          <div className='w-[17.5rem] rounded-[2.5rem] bg-[var(--foreground)] p-2.5 shadow-[var(--shadow-xl)]'>
            <div className='overflow-hidden rounded-[2rem] bg-white'>
              <div className='flex items-center justify-between px-4 pb-2 pt-4'>
                <EllieoAppIcon size={24} />
                <span className='flex gap-1.5'>
                  {[HomeIcon, PlaneIcon, BriefcaseIcon].map((Icon, index) => (
                    <span key={index} className='rounded-full bg-[var(--surface)] px-2 py-1 text-[var(--foreground)]'>
                      <Icon className='size-3.5' />
                    </span>
                  ))}
                </span>
              </div>
              <div className='space-y-2 px-3 pb-3'>
                <div className='overflow-hidden rounded-[1.25rem] bg-[var(--surface)] p-1.5'>
                  <div className='relative h-24 rounded-[1rem] bg-[linear-gradient(135deg,#dce6ff,#eef3ff)]'>
                    <span className='absolute bottom-2 left-2 rounded-full bg-white px-2 py-0.5 text-[12px] font-extrabold text-[var(--foreground)]'>
                      $1,450/mo
                    </span>
                  </div>
                  <p className='px-1.5 pb-1 pt-1.5 text-[12px] font-bold'>Private room · East Village</p>
                </div>
                {SAMPLE_FEED.map((post) => (
                  <div key={post.name} className='rounded-[1.25rem] p-3 shadow-[0_0_0_1px_var(--border)]'>
                    <p className='flex items-center gap-1.5 text-[11px]'>
                      <span className='flex size-5 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white'>
                        {post.name.charAt(0).toUpperCase()}
                      </span>
                      <span className='font-bold'>{post.name}</span>
                      <span className='text-[var(--muted)]'>· {post.school}</span>
                      <post.tag className='ml-auto size-3.5 text-[var(--foreground)]' />
                    </p>
                    <p className='mt-1.5 text-[12.5px] font-bold leading-snug'>{post.title}</p>
                    <p className='mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--muted)]'>
                      <HeartIcon className='size-3' />
                      {post.likes}
                    </p>
                  </div>
                ))}
              </div>
              <div className='flex items-center justify-around border-t border-[var(--border)] px-3 py-2 text-[var(--muted)]'>
                <GridIcon className='size-4' fill='currentColor' />
                <HomeIcon className='size-4' />
                <BagIcon className='size-4' />
                <BriefcaseIcon className='size-4' />
              </div>
            </div>
          </div>
        </section>

        {/* What's in it */}
        <section className='mt-10'>
          <h2 className='text-[22px] font-extrabold tracking-[-0.03em] text-[var(--foreground)]'>What you&apos;ll find</h2>
          <ul className='mt-4 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2'>
            {FEATURES.map((feature) => (
              <li key={feature.title} className='rounded-[1.25rem] bg-[var(--surface)] p-4'>
                <EllieoIconBadge icon={feature.icon} size={44} />
                <p className='mt-2 text-[15px] font-bold text-[var(--foreground)]'>{feature.title}</p>
                <p className='mt-1 text-[13.5px] leading-snug text-[var(--muted-foreground)]'>{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Trust */}
        <section className='mt-10 rounded-[1.5rem] bg-[var(--brand-soft)] p-5'>
          <h2 className='text-[18px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]'>Same account, same community</h2>
          <p className='mt-1.5 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
            When the app launches, sign in with the account you use on ellieo.com. Members verify a school or work email
            before they post, comment or message.
          </p>
        </section>
      </div>
    </div>
  )
}
