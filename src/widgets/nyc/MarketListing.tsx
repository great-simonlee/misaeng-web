'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { AuthorBadges, PhotoLightbox } from '@components'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import { MARKET_CATEGORIES } from '@lib/community/marketplace'
import { canComment } from '@lib/community/schoolGate'
import { cityLoginPath, hrefForCommunityPost } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { BoardSurface } from '@widgets/nyc/BoardPageShell'
import { useCommunityFormat } from '@widgets/nyc/CommunityPostCard'
import { CommunityPostFooter } from '@widgets/nyc/CommunityPostFooter'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'
import { MarketInquiryLauncher } from '@widgets/nyc/MarketChat'
import { MarketZipMap } from '@widgets/nyc/MarketZipMap'

/** 중고거래 list card + detail on the web (owner 11-23: the web posts listings too). Same data as the app's market screens. */

const marketPhotos = (post: CommunityPost) =>
  (post.galleryPhotos ?? []).map((photo) => photo.imageUrl).filter(Boolean).concat(
    !post.galleryPhotos?.length && post.thumbnailUrl ? [post.thumbnailUrl] : [],
  )

function usePrice(post: CommunityPost) {
  const t = useT('community')
  if (post.price === 0) return t('market.free')
  if (typeof post.price === 'number') return `$${post.price.toLocaleString('en-US')}`
  return post.detail?.trim() ? `$${post.detail.trim()}` : ''
}

function StatusBadge({ status }: { status: CommunityPost['marketStatus'] }) {
  const t = useT('community')
  if (!status || status === 'selling') return null
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-bold',
        status === 'reserved' ? 'bg-[#E8F1FF] text-[#2563EB]' : 'bg-[#EEF0F3] text-[var(--muted-foreground)]',
      )}
    >
      {t(`market.status.${status}`)}
    </span>
  )
}

export function MarketPostCard({ post }: { post: CommunityPost }) {
  const t = useT('community')
  const format = useCommunityFormat()
  const city = useCity()
  const photo = marketPhotos(post)[0]
  const price = usePrice(post)
  const sold = post.marketStatus === 'sold'
  return (
    <Link
      href={hrefForCommunityPost(post, city)}
      className='group block overflow-hidden rounded-[1.375rem] bg-white ring-1 ring-[var(--card-ring)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.04),0_20px_40px_rgba(15,23,42,0.08)]'
    >
      <div className='relative aspect-[4/3] bg-[#f1f2f4]'>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- user photo from storage
          <img src={photo} alt='' loading='lazy' className={cn('size-full object-cover transition duration-500 group-hover:scale-[1.03]', sold && 'opacity-50')} />
        ) : (
          <div className='flex size-full items-center justify-center text-[var(--muted)]'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' className='size-10' aria-hidden>
              <path d='M6 7h12l-1 13H7L6 7z' />
              <path d='M9 7a3 3 0 0 1 6 0' />
            </svg>
          </div>
        )}
        <div className='absolute left-2.5 top-2.5'>
          <StatusBadge status={post.marketStatus} />
        </div>
      </div>
      <div className='px-3.5 pb-3.5 pt-3'>
        <p className='truncate text-[14.5px] font-semibold text-[var(--foreground)]'>{post.title}</p>
        <p className={cn('mt-0.5 text-[16px] font-extrabold tracking-tight', post.price === 0 ? 'text-[var(--brand)]' : 'text-[var(--foreground)]')}>
          {price}
        </p>
        <p className='mt-1 truncate text-[12px] text-[var(--muted)]'>
          {[post.marketCategory ? t(`market.categories.${post.marketCategory}`) : null, post.location, format.relativeTime(post.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </Link>
  )
}

export function MarketDetailContent({
  post,
  isAuthor,
  onDelete,
  translationNotice,
  contentLang,
  comments,
}: {
  post: CommunityPost
  isAuthor: boolean
  onDelete: () => void
  translationNotice: ReactNode
  contentLang?: string
  /** Comments go in the left column under the description */
  comments?: ReactNode
}) {
  const t = useT('community')
  const format = useCommunityFormat()
  const city = useCity()
  const href = useCityPath()
  const { user, profile } = useAuth()
  const photos = marketPhotos(post)
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const price = usePrice(post)
  const bodyHtml = post.contentHtml || (post.description ? `<p>${post.description}</p>` : '')

  const info: { label: string; value: string }[] = [
    post.marketCategory ? { label: t('market.category'), value: t(`market.categories.${post.marketCategory}`) } : null,
    post.location ? { label: t('market.zip'), value: post.location } : null,
    post.price !== 0 && post.marketPayments?.length
      ? { label: t('market.payment'), value: post.marketPayments.map((id) => t(`market.payments.${id}`)).join(', ') }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  const go = (step: number) => setIndex((i) => (i + step + photos.length) % photos.length)

  // Product page (owner 11-23): gallery + description + comments on the left, a sticky buy box on the right
  return (
    <>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8'>
        <div className='flex min-w-0 flex-col gap-4'>
          {/* Gallery: 4:3 stage, arrows, thumbnail strip */}
          <BoardSurface className='overflow-hidden'>
            <div className='group relative aspect-[4/3] bg-[#f1f2f4]'>
              {photos.length ? (
                <button type='button' onClick={() => setLightbox(index)} className='block size-full' aria-label={post.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user photo from storage */}
                  <img src={photos[index]} alt='' className={cn('size-full object-cover', post.marketStatus === 'sold' && 'opacity-60')} />
                </button>
              ) : (
                <div className='flex size-full items-center justify-center text-[var(--muted)]'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' className='size-16' aria-hidden>
                    <path d='M6 7h12l-1 13H7L6 7z' />
                    <path d='M9 7a3 3 0 0 1 6 0' />
                  </svg>
                </div>
              )}
              <div className='absolute left-3 top-3'>
                <StatusBadge status={post.marketStatus} />
              </div>
              {photos.length > 1 ? (
                <>
                  <button type='button' onClick={() => go(-1)} aria-label='←' className='absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[20px] font-bold shadow-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100'>
                    ‹
                  </button>
                  <button type='button' onClick={() => go(1)} aria-label='→' className='absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[20px] font-bold shadow-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100'>
                    ›
                  </button>
                  <span className='absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white'>
                    {index + 1} / {photos.length}
                  </span>
                </>
              ) : null}
            </div>
            {photos.length > 1 ? (
              <div className='flex gap-2 overflow-x-auto p-3'>
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type='button'
                    onClick={() => setIndex(i)}
                    className={cn('aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition', i === index ? 'ring-[var(--brand)]' : 'ring-transparent opacity-70 hover:opacity-100')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
                    <img src={url} alt='' className='size-full object-cover' />
                  </button>
                ))}
              </div>
            ) : null}
          </BoardSurface>

          {/* Description + seller */}
          <BoardSurface as='article' className='overflow-hidden'>
            {bodyHtml ? (
              <div lang={contentLang} className='px-5 py-6 sm:px-8 sm:py-7'>
                <CommunityRichBody html={bodyHtml} />
              </div>
            ) : null}
            <CommunityPostFooter
              post={post}
              boardId='marketplace'
              anonymous={false}
              isAuthor={isAuthor}
              loginNext={hrefForCommunityPost(post, city)}
              onDelete={onDelete}
              inset={Boolean(bodyHtml)}
            />
          </BoardSurface>

          {comments}
        </div>

        {/* Buy box */}
        <aside className='lg:sticky lg:top-[5.5rem]'>
          <BoardSurface className='p-5 sm:p-6'>
            <div className='flex flex-wrap items-center gap-2'>
              <AuthorBadges schoolId={post.authorSchoolId} workplaceVerified={post.authorWorkplaceVerified} instagramVerified={post.authorInstagramVerified} parent={post.authorParent} />
              <span className='text-[12px] text-[var(--muted)]'>{format.relativeTime(post.createdAt)}</span>
              <span className='text-[12px] text-[var(--muted)]'>{t('detail.views', { n: format.count(post.viewCount) })}</span>
            </div>
            <h1 lang={contentLang} className='mt-3 break-keep text-[1.5rem] font-bold leading-snug tracking-[-0.03em] text-[var(--foreground)]'>
              {post.title}
            </h1>
            {translationNotice ? <div className='mt-1.5'>{translationNotice}</div> : null}
            <p className={cn('mt-2 text-[1.75rem] font-extrabold tracking-tight', post.price === 0 ? 'text-[var(--brand)]' : 'text-[var(--foreground)]')}>{price}</p>

            {info.length ? (
              <dl className='mt-4 divide-y divide-black/[0.05] rounded-2xl bg-[#f7f8fa] px-4'>
                {info.map((item) => (
                  <div key={item.label} className='flex items-center justify-between gap-3 py-2.5 text-[14px]'>
                    <dt className='text-[var(--muted)]'>{item.label}</dt>
                    <dd className='text-right font-semibold text-[var(--foreground)]'>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {post.location ? <MarketZipMap zip={post.location} className='mt-3' /> : null}

            <MarketInquiryLauncher
              post={post}
              isAuthor={isAuthor}
              signedIn={Boolean(user)}
              canInquire={canComment(profile)}
              loginHref={cityLoginPath(city, hrefForCommunityPost(post, city))}
              verifyHref={href('/me')}
              inboxHref={`${href('/me/market')}?post=${encodeURIComponent(post.id)}`}
            />
            <p className='mt-3 rounded-xl bg-[#FFF4E5] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#9A5B00]'>{t('market.safety')}</p>
          </BoardSurface>
        </aside>
      </div>

      <PhotoLightbox
        open={lightbox !== null}
        items={photos.map((imageUrl, i) => ({ id: `photo-${i}`, imageUrl }))}
        index={lightbox ?? 0}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </>
  )
}

/** 중고거래 검색: keyword, category, price range (owner 11-23). Client side over the loaded listings. */
export type MarketFilter = { q: string; category: string; min: string; max: string; freeOnly: boolean }

export const EMPTY_MARKET_FILTER: MarketFilter = { q: '', category: 'all', min: '', max: '', freeOnly: false }

export function matchesMarketFilter(post: CommunityPost, filter: MarketFilter) {
  const q = filter.q.trim().toLowerCase()
  if (q && ![post.title, post.description, post.location].join(' ').toLowerCase().includes(q)) return false
  if (filter.category !== 'all' && post.marketCategory !== filter.category) return false
  // 판매완료는 목록에서 항상 뺀다 (owner 11-23)
  if (post.marketStatus === 'sold') return false
  const price = typeof post.price === 'number' ? post.price : null
  if (filter.freeOnly) return price === 0
  if (filter.min && (price == null || price < Number(filter.min))) return false
  if (filter.max && (price == null || price > Number(filter.max))) return false
  return true
}

export const isMarketFilterActive = (filter: MarketFilter) =>
  Boolean(filter.q.trim() || filter.category !== 'all' || filter.min || filter.max || filter.freeOnly)

export function MarketSearchPanel({
  filter,
  onChange,
  resultCount,
  className,
}: {
  filter: MarketFilter
  onChange: (next: MarketFilter) => void
  resultCount: number
  className?: string
}) {
  const t = useT('community')
  const set = (patch: Partial<MarketFilter>) => onChange({ ...filter, ...patch })
  const digits = (value: string) => value.replace(/\D/g, '').slice(0, 6)
  const field =
    'h-10 w-full rounded-xl bg-[#f4f5f7] px-3 text-[13.5px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]'
  const chip = (on: boolean) =>
    cn(
      'h-8 rounded-full px-3 text-[12.5px] font-semibold transition',
      on ? 'bg-[var(--foreground)] text-white' : 'bg-[#f4f5f7] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
    )
  return (
    <section className={cn('rounded-[1.375rem] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-[var(--card-ring)]', className)}>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('market.searchTitle')}</h2>
        <span className='text-[12.5px] font-semibold text-[var(--muted)]'>{t('market.resultCount', { count: resultCount })}</span>
      </div>

      <label className='relative mt-3 block'>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]' aria-hidden>
          <circle cx='11' cy='11' r='7' />
          <path strokeLinecap='round' d='M20 20l-3.5-3.5' />
        </svg>
        <span className='sr-only'>{t('market.searchTitle')}</span>
        <input value={filter.q} onChange={(e) => set({ q: e.target.value.slice(0, 60) })} placeholder={t('market.searchPlaceholder')} className={cn(field, 'pl-9')} />
      </label>

      <p className='mt-4 text-[12.5px] font-semibold text-[var(--foreground)]'>{t('market.category')}</p>
      <div className='mt-2 flex flex-wrap gap-1.5'>
        <button type='button' aria-pressed={filter.category === 'all'} onClick={() => set({ category: 'all' })} className={chip(filter.category === 'all')}>
          {t('market.all')}
        </button>
        {MARKET_CATEGORIES.map((id) => (
          <button key={id} type='button' aria-pressed={filter.category === id} onClick={() => set({ category: id })} className={chip(filter.category === id)}>
            {t(`market.categories.${id}`)}
          </button>
        ))}
      </div>

      <div className='mt-4 flex items-center justify-between gap-2'>
        <p className='text-[12.5px] font-semibold text-[var(--foreground)]'>{t('market.priceRange')}</p>
        <button type='button' aria-pressed={filter.freeOnly} onClick={() => set({ freeOnly: !filter.freeOnly })} className={chip(filter.freeOnly)}>
          {t('market.freeOnly')}
        </button>
      </div>
      <div className={cn('mt-2 flex items-center gap-2', filter.freeOnly && 'pointer-events-none opacity-40')}>
        <input value={filter.min} onChange={(e) => set({ min: digits(e.target.value) })} inputMode='numeric' placeholder={`$ ${t('market.priceMin')}`} aria-label={t('market.priceMin')} className={field} />
        <span className='text-[var(--muted)]'>~</span>
        <input value={filter.max} onChange={(e) => set({ max: digits(e.target.value) })} inputMode='numeric' placeholder={`$ ${t('market.priceMax')}`} aria-label={t('market.priceMax')} className={field} />
      </div>


      {isMarketFilterActive(filter) ? (
        <button type='button' onClick={() => onChange(EMPTY_MARKET_FILTER)} className='mt-4 text-[13px] font-semibold text-[var(--brand)]'>
          {t('market.reset')}
        </button>
      ) : null}
    </section>
  )
}
