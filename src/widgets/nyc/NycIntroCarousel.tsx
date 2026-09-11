'use client'

import {
  NYC_INTRO_CAROUSEL_SLIDES,
  type NycIntroCarouselSlide,
} from '@lib/constants/nycIntroCarousel'

export function NycIntroCarousel() {
  return (
    <div
      className='flex gap-6 overflow-x-auto scroll-smooth px-6 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-10 lg:px-14 [&::-webkit-scrollbar]:hidden'
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {NYC_INTRO_CAROUSEL_SLIDES.map((slide, index) => (
        <CarouselSlide
          key={slide.id}
          slide={slide}
          index={index}
          total={NYC_INTRO_CAROUSEL_SLIDES.length}
        />
      ))}
    </div>
  )
}

function CarouselSlide({
  slide,
  index,
  total,
}: {
  slide: NycIntroCarouselSlide
  index: number
  total: number
}) {
  const pageLabel = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`

  return (
    <article
      className='relative h-[min(380px,85vw)] w-[min(380px,85vw)] shrink-0 overflow-hidden text-[#faf8f4] shadow-[0_16px_36px_rgba(16,27,48,0.24)]'
      style={{
        scrollSnapAlign: 'start',
        backgroundImage: `url(${slide.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-label={`${slide.kicker}: ${slide.headline}`}
    >
      <div
        className='absolute inset-0'
        style={{ background: slide.wash }}
        aria-hidden
      />
      <div
        className='absolute inset-0'
        style={{ background: slide.glow }}
        aria-hidden
      />
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.12]'
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)',
        }}
        aria-hidden
      />

      <div className='relative z-[2] flex h-full flex-col justify-between px-6 pb-9 pt-[22px]'>
        <div className='flex items-start justify-between'>
          <span className='text-[11px] font-medium tracking-[0.04em] text-[#e8b84b]'>
            {slide.kicker}
          </span>
          <span className='text-[11px] font-medium text-[#faf8f4]/60'>
            {pageLabel}
          </span>
        </div>

        <div className='mt-auto'>
          <h3 className='m-0 text-[19px] font-bold leading-[1.35] tracking-[-0.2px]'>
            {slide.headline}
          </h3>
          <p className='mt-2 line-clamp-2 max-w-[322px] text-[12px] font-medium leading-[1.65] text-[#faf8f4]/95'>
            {slide.body}
          </p>

          {slide.schools && slide.schools.length > 0 ? (
            <div className='mt-3.5 flex flex-wrap gap-4'>
              {slide.schools.map((school) => (
                <span
                  key={school}
                  className='text-[11px] font-medium text-[#faf8f4]/80'
                >
                  {school}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
