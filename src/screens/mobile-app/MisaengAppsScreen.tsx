import { BrandAppCards } from '@widgets/BrandApps'

/** misaeng.com/mobile-app — 미생(한국어·영어)·엘리오(베트남어·영어) 두 앱 다운로드 */
export function MisaengAppsScreen() {
  return (
    <div className='min-w-0 overflow-x-hidden bg-[var(--surface)]'>
      <section className='relative overflow-hidden'>
        <div
          className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(var(--brand-rgb)/0.14),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(47,109,246,0.10),transparent)]'
          aria-hidden
        />
        <div className='relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20'>
          <div className='mx-auto max-w-2xl text-center'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-brand'>Mobile apps</p>
            <h1 className='mt-3 text-[2rem] font-bold leading-[1.1] tracking-tight text-[var(--foreground)] sm:mt-4 sm:text-5xl'>
              Pick the app
              <br />
              <span className='text-brand'>in your language.</span>
            </h1>
            <p className='mt-4 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-lg'>
              Rentals and real estate brokerage, roommate matching, jobs and community—on iOS and Android.
            </p>
          </div>
          <BrandAppCards className='mt-8 sm:mt-12' />
        </div>
      </section>
    </div>
  )
}
