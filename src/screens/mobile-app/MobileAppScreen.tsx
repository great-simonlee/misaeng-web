import { AppStoreBadge, GooglePlayBadge } from '@components/StoreBadges'
import { APP_STORE_URL, PLAY_STORE_URL } from '@lib/constants/app-store'
import { cn } from '@lib'

const FEATURES = [
  {
    title: 'Verified listings',
    description:
      'Structured unit details, on-site media standards, and identity-checked listers—no sketchy Craigslist vibes.',
    icon: ShieldIcon,
    span: 'lg:col-span-2',
  },
  {
    title: 'Roommate matching',
    description: 'Profiles verified through school email and LinkedIn. See who is waiting before you tour.',
    icon: UsersIcon,
    span: 'lg:col-span-1',
  },
  {
    title: 'Secure messaging',
    description: 'Connect in-app with verified users. No scattered DMs or unverified numbers.',
    icon: ChatIcon,
    span: 'lg:col-span-1',
  },
  {
    title: 'Map & room prices',
    description: 'Browse NYC on a map with per-room breakdowns and net-effective rent at a glance.',
    icon: MapIcon,
    span: 'lg:col-span-2',
  },
] as const

const STEPS = [
  {
    step: '01',
    title: 'Download & verify',
    body: 'Create your profile with identity checks built for NYC renters and roommates.',
  },
  {
    step: '02',
    title: 'Browse & match',
    body: 'Filter listings, compare room prices, and find compatible roommates in your building.',
  },
  {
    step: '03',
    title: 'Message & tour',
    body: 'Chat securely in-app and request tours without leaving the platform.',
  },
] as const

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' aria-hidden>
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z' />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' aria-hidden>
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 0 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 0 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' aria-hidden>
      <path strokeLinecap='round' strokeLinejoin='round' d='M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z' />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' aria-hidden>
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' />
      <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z' />
    </svg>
  )
}

function StoreButtons({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <AppStoreBadge href={APP_STORE_URL} />
      <GooglePlayBadge href={PLAY_STORE_URL} />
    </div>
  )
}

export function MobileAppScreen() {
  return (
    <div className='min-w-0 overflow-x-hidden bg-white'>
      {/* Hero — single page opens here */}
      <section className='relative overflow-hidden'>
        <div
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(var(--brand-rgb)/0.18),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgb(var(--brand-rgb)/0.08),transparent)]'
          aria-hidden
        />

        <div className='relative mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8 lg:py-20'>
          <div className='min-w-0'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-brand'>
              Everything in one app
            </p>

            <h1 className='mt-3 text-[2rem] font-bold leading-[1.08] tracking-tight text-slate-900 sm:mt-4 sm:text-5xl lg:text-[3.25rem]'>
              NYC housing,
              <span className='block text-brand'>in your pocket.</span>
            </h1>

            <p className='mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 lg:text-lg'>
              Browse verified listings, match with roommates, and message safely—all built for
              students and young professionals in New York City.
            </p>

            <StoreButtons className='mt-8 justify-center' />

            <dl className='mt-10 grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-8 sm:gap-6'>
              {[
                { value: '100%', label: 'Verified listers' },
                { value: 'NYC', label: 'Room-by-room pricing' },
                { value: 'In-app', label: 'Secure messaging' },
              ].map(({ value, label }) => (
                <div key={label} className='min-w-0'>
                  <dt className='text-lg font-bold tracking-tight text-slate-900 sm:text-xl'>
                    {value}
                  </dt>
                  <dd className='mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs'>
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className='border-t border-slate-200/80 bg-[#f8fafc]'>
        <div className='mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20'>
          <div className='max-w-2xl'>
            <h2 className='text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl'>
              Built for how NYC renters actually search
            </h2>
          </div>

          <div className='mt-8 grid gap-4 sm:mt-10 lg:grid-cols-3 lg:gap-5'>
            {FEATURES.map(({ title, description, icon: Icon, span }) => (
              <article
                key={title}
                className={cn(
                  'group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/20',
                  span,
                )}
              >
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15 transition group-hover:bg-brand group-hover:text-white'>
                  <Icon className='h-5 w-5' />
                </div>
                <h3 className='mt-4 text-lg font-bold tracking-tight text-slate-900'>{title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-slate-600'>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works + download — one closing block */}
      <section className='relative overflow-hidden bg-[#0f172a] text-white'>
        <div
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--brand-rgb)/0.35),transparent_55%)]'
          aria-hidden
        />

        <div className='relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20'>
          <div className='grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-16'>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52B5EE]'>
                How it works
              </p>
              <h2 className='mt-2 text-2xl font-bold tracking-tight sm:text-3xl'>
                From download to keys—without the chaos
              </h2>

              <ol className='mt-8 space-y-6'>
                {STEPS.map(({ step, title, body }) => (
                  <li key={step} className='flex gap-4'>
                    <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#52B5EE] ring-1 ring-white/10'>
                      {step}
                    </span>
                    <div>
                      <p className='font-semibold text-white'>{title}</p>
                      <p className='mt-1 text-sm leading-relaxed text-white/65'>{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className='rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-sm sm:p-8'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#52B5EE]'>
                Download
              </p>
              <h3 className='mt-2 text-xl font-bold sm:text-2xl'>Get the Ellieo app</h3>
              <p className='mt-2 text-sm leading-relaxed text-white/65'>
                Free on iOS and Android. Live on the App Store and Google Play for verified NYC
                housing.
              </p>
              <StoreButtons className='mt-6' />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
