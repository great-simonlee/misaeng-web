import Link from 'next/link'
import Image from 'next/image'

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

      {/* Ellieo 한줄 소개: 배너 맨 위 고정, 검정 70% 투명 */}
      <div className='absolute left-0 right-0 top-0 z-10 bg-black/70 px-3 py-2 text-center sm:px-6 sm:py-2'>
        <p className='mx-auto max-w-4xl text-xs leading-snug text-white/90 sm:whitespace-nowrap sm:text-base sm:leading-normal'>
          <strong className='font-bold text-white'>Ellieo</strong>—Misaeng&apos;s New York City app
          for verified housing & roommates. Launching this Spring. 🚀
        </p>
      </div>

      <div className='relative z-10 flex w-full max-w-5xl min-w-0 flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8 lg:pt-28 lg:pb-20'>
        {/* Decorative line */}
        <div className='mb-3 flex items-center justify-center gap-2 sm:mb-3'>
          <div className='h-px w-8 bg-[#F64310]/80 sm:w-12' aria-hidden />
          <div className='h-1 w-1 shrink-0 rounded-full bg-[#F64310]' aria-hidden />
          <div className='h-px w-8 bg-[#F64310]/80 sm:w-12' aria-hidden />
        </div>
        <p className='text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 sm:tracking-[0.28em]'>
          Next-Gen Housing for New York City
        </p>
        <h1 className='mt-4 text-balance text-xl font-bold leading-[1.4] tracking-tight text-white sm:mt-6 sm:leading-[1.25] sm:text-4xl md:text-[2.75rem]'>
          Half the Rent, Twice the Story.
        </h1>
        <p className='mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base'>
          Misaeng is building <strong className='font-semibold text-white'>Ellieo</strong>—
          <br className='sm:hidden' /> a secure, identity-verified rental platform{' '}
          <br className='sm:hidden' />
          for students and professionals in New York City.
        </p>

        <div className='mt-6 flex w-full max-w-sm flex-col items-center gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center'>
          <Link
            href='https://ellieo.com/#early'
            target='_blank'
            rel='noopener noreferrer'
            className='group inline-flex min-h-[44px] w-full max-w-[280px] items-center justify-center gap-1.5 rounded-full bg-[#F64310] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(246,67,16,0.35)] transition active:scale-[0.98] hover:bg-[#d93a0e] hover:shadow-[0_0_32px_rgba(246,67,16,0.45)] sm:min-h-0 sm:max-w-none sm:w-auto sm:py-3'
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Get Early Access to Ellieo
            <span className='text-white/80 transition group-hover:translate-x-0.5' aria-hidden>
              →
            </span>
          </Link>
          <Link
            href='#about-ellieo'
            className='inline-flex min-h-[44px] w-full max-w-[280px] items-center justify-center rounded-full border border-white/50 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition active:scale-[0.98] hover:bg-white/15 sm:min-h-0 sm:max-w-none sm:w-auto sm:py-3'
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            How it works
          </Link>
        </div>

        <div className='mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 text-xs leading-relaxed text-white/85 sm:mt-6 sm:gap-x-6 sm:leading-normal'>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-[#F64310]' />
            Identity verification
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-[#F64310]' />
            Scam prevention
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='h-1 w-1 rounded-full bg-[#F64310]' />
            New York City launch 2026
          </span>
        </div>
      </div>
    </section>
  )
}
