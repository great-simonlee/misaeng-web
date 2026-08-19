import Image from 'next/image'

import { NYC_MAGAZINE_PREVIEWS } from '@lib/constants/nyc'

export function MagazinePreviewSection() {
  return (
    <section aria-label='NYC 매거진'>
      <div className='mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <p className='text-[11px] font-medium tracking-[0.2em] text-[var(--muted)]'>
            NYC 매거진
          </p>
          <h2 className='mt-1.5 text-base font-bold tracking-tight text-[var(--foreground)] sm:text-lg'>
            에디터가 고른 뉴욕 라이프
          </h2>
          <p className='mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]'>
            게시판과 별개로, 맛집·이벤트·놀거리를 짧게 소개하는 콘텐츠예요.
          </p>
        </div>
        <p className='shrink-0 text-xs font-medium text-[#F64310]'>
          곧 공개됩니다
        </p>
      </div>

      <div className='-mx-4 flex gap-3 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden'>
        {NYC_MAGAZINE_PREVIEWS.map((item) => (
          <article
            key={item.id}
            className='w-[68vw] max-w-[220px] shrink-0 sm:w-auto sm:max-w-none'
          >
            <div className='relative aspect-[16/10] overflow-hidden rounded-lg bg-[var(--surface)] sm:aspect-[3/2]'>
              <Image
                src={item.image}
                alt=''
                fill
                className='object-cover'
                sizes='(max-width: 640px) 68vw, 25vw'
              />
            </div>
            <p className='mt-2 text-[11px] font-semibold tracking-wide text-[#F64310]'>
              {item.tag}
            </p>
            <h3 className='mt-0.5 text-sm font-semibold leading-snug text-[var(--foreground)]'>
              {item.title}
            </h3>
            <p className='mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]'>
              {item.excerpt}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
