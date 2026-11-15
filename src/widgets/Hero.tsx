import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className='relative flex min-h-[85vh] sm:min-h-[70vh] md:min-h-[75vh] items-center justify-center overflow-hidden'>
      {/* Main banner background */}
      <Image
        src='/img/main_banner_1.png'
        alt='Brooklyn Bridge, New York City at sunset'
        fill
        className='object-cover object-center'
        priority
        sizes='100vw'
      />
      {/* Gradient overlay */}
      <div
        className='absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/75'
        aria-hidden
      />
      <div className='absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30' />
      <div className='absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent' />

      {/* 두 앱 한줄 소개: 배너 맨 위 고정, 검정 70% 투명 */}
      <div className='absolute left-0 right-0 top-0 z-10 bg-black/70 px-3 py-2 text-center sm:px-6 sm:py-2'>
        <p className='mx-auto max-w-4xl text-xs leading-snug text-white/90 sm:whitespace-nowrap sm:text-base sm:leading-normal'>
          <strong className='font-bold text-white'>Misaeng</strong> &amp;{' '}
          <strong className='font-bold text-white'>Ellieo</strong>
          —live on the App Store & Google Play 🎉
        </p>
      </div>

      <div className='relative z-10 flex w-full max-w-5xl min-w-0 flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8 lg:pt-28 lg:pb-20'>
        {/* Decorative line */}
        <div className='mb-3 flex items-center justify-center gap-2 sm:mb-3'>
          <div className='h-px w-8 bg-brand/80 sm:w-12' aria-hidden />
          <div
            className='h-1 w-1 shrink-0 rounded-full bg-brand'
            aria-hidden
          />
          <div className='h-px w-8 bg-brand/80 sm:w-12' aria-hidden />
        </div>
        <p className='text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 sm:tracking-[0.28em]'>
          Everyday-life platforms in the U.S.
        </p>
        <h1 className='mt-4 text-balance text-xl font-bold leading-[1.4] tracking-tight text-white sm:mt-6 sm:leading-[1.25] sm:text-4xl md:text-[2.75rem]'>
          Half the Rent, Twice the Story.
        </h1>
        <p className='mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base'>
          <strong className='font-semibold text-white'>Misaeng</strong>{' '}in
          Korean &amp; English, <br className='sm:hidden' />
          <strong className='font-semibold text-white'>Ellieo</strong>{' '}in
          Vietnamese &amp; English. <br />
          Rentals, real estate brokerage, roommate matching, <br className='sm:hidden' />
          jobs and community for students and professionals.
        </p>

        <div className='mt-6 flex w-full max-w-sm flex-col items-center gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center'>
          <Link
            href='/mobile-app#misaeng'
            className='group inline-flex min-h-[44px] w-full max-w-[280px] items-center justify-center gap-1.5 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgb(var(--brand-rgb)/0.35)] transition active:scale-[0.98] hover:bg-brand-hover hover:shadow-[0_0_32px_rgb(var(--brand-rgb)/0.45)] sm:min-h-0 sm:max-w-none sm:w-auto sm:py-3'
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Download Misaeng
            <span
              className='text-white/80 transition group-hover:translate-x-0.5'
              aria-hidden
            >
              →
            </span>
          </Link>
          <Link
            href='/mobile-app#ellieo'
            className='group inline-flex min-h-[44px] w-full max-w-[280px] items-center justify-center gap-1.5 rounded-full bg-[#2f6df6] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(47,109,246,0.35)] transition active:scale-[0.98] hover:bg-[#2455c4] sm:min-h-0 sm:max-w-none sm:w-auto sm:py-3'
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Download Ellieo
            <span
              className='text-white/80 transition group-hover:translate-x-0.5'
              aria-hidden
            >
              →
            </span>
          </Link>
        </div>

        <div className='mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 text-xs leading-relaxed text-white/85 sm:mt-6 sm:gap-x-6 sm:leading-normal'>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-brand' />
            Real estate brokerage
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-brand' />
            Roommate matching
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-brand' />
            Live on iOS & Android
          </span>
        </div>
      </div>
    </section>
  );
}
