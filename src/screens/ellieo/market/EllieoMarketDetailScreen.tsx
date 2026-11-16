'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { MARKET_STATUSES, normalizeMarketZip, type MarketStatus } from '@lib/community/marketplace'
import {
  deleteMarketListing,
  fetchMarketPost,
  fetchMarketThreads,
  pingMarketView,
  setMarketStatus,
  type MarketThreadSummary,
} from '@lib/community/marketplace.client'
import { cityLoginPath } from '@lib/constants/cities'
import { useFormat, useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { EllieoPersonAvatar } from '@widgets/ellieo/EllieoFeedCard'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import { BadgeCheckIcon, BagIcon, ChevronRightIcon, ShieldCheckIcon } from '@widgets/ellieo/icons'
import { CommunityRichBody } from '@widgets/nyc/CommunityRichBody'

import { MarketStatusBadge, useMarketPrice } from './MarketCard'
import { MarketAskBox, MarketThread } from './MarketThread'

/** Ellieo marketplace listing: photos, price/status, seller, ask-the-seller thread; the seller manages it here */
export function EllieoMarketDetailScreen({ postId }: { postId: string }) {
  const t = useT('community')
  const href = useCityPath()
  const { user, loading: authLoading } = useAuth()
  const [post, setPost] = useState<CommunityPost | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    fetchMarketPost(postId)
      .then((found) => {
        if (!alive) return
        setPost(found && found.categoryId === 'marketplace' ? found : null)
        if (found) pingMarketView(found.id)
      })
      .catch(() => alive && setPost(null))
    return () => {
      alive = false
    }
  }, [postId])

  const back = (
    <Link href={href('/marketplace')} className='inline-flex items-center gap-1 text-[14px] font-medium text-[var(--muted-foreground)]'>
      <span aria-hidden>‹</span> {t('ellieoMarket.detail.back')}
    </Link>
  )

  if (post === undefined || authLoading) {
    return (
      <Shell>
        {back}
        <div className='flex justify-center py-24'>
          <EllieoDots />
        </div>
      </Shell>
    )
  }
  if (!post) {
    return (
      <Shell>
        {back}
        <div className='mt-6 flex flex-col items-center rounded-[1.75rem] bg-[var(--surface)] px-6 py-12 text-center'>
          <EllieoIconBadge icon={BagIcon} />
          <p className='mt-4 text-[16px] font-bold text-[var(--foreground)]'>{t('ellieoMarket.detail.notFound')}</p>
        </div>
      </Shell>
    )
  }

  const isOwner = Boolean(user && user.uid === post.authorUid)
  return (
    <Shell>
      {back}
      <ListingBody post={post} />
      {isOwner ? (
        <OwnerPanel post={post} onChange={setPost} />
      ) : (
        <BuyerPanel post={post} signedIn={Boolean(user)} />
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-32 pt-3 lg:pb-16 lg:pt-6'>{children}</div>
    </div>
  )
}

function ListingBody({ post }: { post: CommunityPost }) {
  const t = useT('community')
  const format = useFormat()
  const price = useMarketPrice()
  const zip = normalizeMarketZip(post.location)
  const photos = (post.galleryPhotos ?? []).map((photo) => photo.imageUrl).filter(Boolean)
  if (photos.length === 0 && post.thumbnailUrl) photos.push(post.thumbnailUrl)
  const verified = Boolean(post.authorSchoolId || post.authorWorkplaceVerified)

  return (
    <article className='mt-3'>
      <PhotoCarousel photos={photos} sold={post.marketStatus === 'sold'} />

      <div className='mt-3 flex flex-wrap items-center gap-1.5'>
        <MarketStatusBadge status={post.marketStatus} />
      </div>
      <p className={cn('mt-1.5 text-[22px] font-bold tabular-nums leading-tight', post.price === 0 ? 'text-[var(--brand)]' : 'text-[var(--foreground)]')}>
        {price(post.price)}
      </p>
      <h1 className='mt-1 text-[17px] font-semibold leading-snug text-[var(--foreground)]'>{post.title}</h1>
      <p className='mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--muted)]'>
        {zip ? <span>{t('ellieoMarket.detail.near', { zip })}</span> : null}
        {zip ? <span aria-hidden>·</span> : null}
        <span>{format.relative(post.createdAt)}</span>
        {post.viewCount ? <span>· {t('ellieoMarket.detail.views', { count: post.viewCount })}</span> : null}
      </p>

      {/* Key facts: 2 columns with hairlines */}
      <dl className='mt-4 grid grid-cols-[7rem_1fr] border-t border-[var(--border)] text-[13.5px]'>
        {post.marketCategory ? (
          <>
            <dt className='border-b border-[var(--border)] py-2 text-[var(--muted-foreground)]'>{t('ellieoMarket.form.category')}</dt>
            <dd className='border-b border-[var(--border)] py-2 text-[var(--foreground)]'>{t(`ellieoMarket.categories.${post.marketCategory}`)}</dd>
          </>
        ) : null}
        <dt className='border-b border-[var(--border)] py-2 text-[var(--muted-foreground)]'>{t('ellieoMarket.detail.statusLabel')}</dt>
        <dd className='border-b border-[var(--border)] py-2 text-[var(--foreground)]'>{t(`ellieoMarket.status.${post.marketStatus ?? 'selling'}`)}</dd>
        {post.marketPayments && post.marketPayments.length > 0 ? (
          <>
            <dt className='border-b border-[var(--border)] py-2 text-[var(--muted-foreground)]'>{t('ellieoMarket.detail.payments')}</dt>
            <dd className='border-b border-[var(--border)] py-2 text-[var(--foreground)]'>
              {post.marketPayments.map((payment) => t(`ellieoMarket.payments.${payment}`)).join(', ')}
            </dd>
          </>
        ) : null}
        {zip ? (
          <>
            <dt className='border-b border-[var(--border)] py-2 text-[var(--muted-foreground)]'>{t('ellieoMarket.form.zip')}</dt>
            <dd className='border-b border-[var(--border)] py-2 text-[var(--foreground)]'>{zip}</dd>
          </>
        ) : null}
      </dl>

      {post.contentHtml ? (
        <CommunityRichBody html={post.contentHtml} className='mt-4 !text-[15px] !leading-[1.6] text-[var(--foreground)]' />
      ) : null}

      <div className='mt-5 flex items-center gap-3 border-y border-[var(--border)] py-3'>
        <EllieoPersonAvatar name={post.authorNickname || '?'} photo={post.authorPhotoURL} />
        <div className='min-w-0 flex-1'>
          <p className='text-[12px] text-[var(--muted)]'>{t('ellieoMarket.detail.seller')}</p>
          <p className='flex items-center gap-1 truncate text-[15px] font-bold text-[var(--foreground)]'>
            {post.authorNickname || '?'}
            {verified ? <BadgeCheckIcon className='size-4 shrink-0 text-[var(--brand)]' aria-label={t('ellieoMarket.detail.verified')} /> : null}
          </p>
          {post.authorSchoolName ? <p className='truncate text-[12.5px] text-[var(--muted-foreground)]'>{post.authorSchoolName}</p> : null}
        </div>
      </div>

      <p className='mt-3 flex gap-2 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
        <ShieldCheckIcon className='mt-0.5 size-4 shrink-0 text-[var(--brand)]' />
        {t('ellieoMarket.detail.safety')}
      </p>
    </article>
  )
}

function PhotoCarousel({ photos, sold }: { photos: string[]; sold: boolean }) {
  const t = useT('community')
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  if (photos.length === 0) {
    return (
      <div className='flex aspect-square items-center justify-center rounded-[10px] bg-[var(--surface)] text-[var(--muted)] sm:aspect-[4/3]'>
        <BagIcon className='size-10' />
      </div>
    )
  }

  return (
    <div className='relative'>
      <div
        ref={track}
        onScroll={(event) => {
          const el = event.currentTarget
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
        }}
        className='flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-[10px] bg-[var(--surface)] [scrollbar-width:none] sm:aspect-[4/3] [&::-webkit-scrollbar]:hidden'
      >
        {photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- listing photo URL
          <img
            key={src + i}
            src={src}
            alt={t('ellieoMarket.detail.photo', { index: i + 1, total: photos.length })}
            className={cn('size-full shrink-0 snap-center object-cover', sold && 'opacity-60')}
          />
        ))}
      </div>
      {photos.length > 1 ? (
        <span className='pointer-events-none absolute bottom-2.5 right-2.5 rounded bg-black/60 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white'>
          {index + 1}/{photos.length}
        </span>
      ) : null}
    </div>
  )
}

function BuyerPanel({ post, signedIn }: { post: CommunityPost; signedIn: boolean }) {
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const [threads, setThreads] = useState<MarketThreadSummary[] | 'error' | null>(signedIn ? null : [])

  const loadThreads = useCallback(() => {
    if (!signedIn) return
    setThreads(null)
    fetchMarketThreads('buying', post.id)
      .then(setThreads)
      .catch(() => setThreads('error'))
  }, [post.id, signedIn])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  return (
    <>
    <section id='ask-seller' className='mt-6 scroll-mt-28 border-t border-[var(--border)] pt-4'>
      <h2 className='text-[16px] font-bold text-[var(--foreground)]'>{t('ellieoMarket.ask.title')}</h2>
      {!signedIn ? (
        <Link
          href={cityLoginPath(city, href(`/marketplace/${encodeURIComponent(post.id)}`))}
          className='mt-3 flex h-12 items-center justify-center rounded-full bg-[var(--brand)] text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
        >
          {t('ellieoMarket.ask.login')}
        </Link>
      ) : threads === null ? (
        <div className='flex justify-center py-6'>
          <EllieoDots />
        </div>
      ) : threads === 'error' ? (
        <LoadFailed onRetry={loadThreads} />
      ) : threads.length > 0 ? (
        <div className='mt-3'>
          <MarketThread threadId={threads[0].id} />
        </div>
      ) : post.marketStatus === 'sold' ? (
        <p className='mt-2 text-[14px] text-[var(--muted-foreground)]'>{t('ellieoMarket.ask.sold')}</p>
      ) : (
        <MarketAskBox postId={post.id} onSent={loadThreads} />
      )}
    </section>
    {/* Phones/tablets: bottom action bar with the main action (spec v4) */}
    {post.marketStatus !== 'sold' ? (
      <div
        className='fixed inset-x-0 z-[9500] border-t border-[var(--border)] bg-white px-4 py-2.5 lg:hidden'
        style={{ bottom: 'var(--bottom-nav-h)' }}
      >
        <a
          href={signedIn ? '#ask-seller' : cityLoginPath(city, href(`/marketplace/${encodeURIComponent(post.id)}`))}
          className='flex h-11 items-center justify-center rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white'
        >
          {signedIn ? t('ellieoMarket.ask.title') : t('ellieoMarket.ask.login')}
        </a>
      </div>
    ) : null}
    </>
  )
}

function OwnerPanel({ post, onChange }: { post: CommunityPost; onChange: (post: CommunityPost) => void }) {
  const t = useT('community')
  const href = useCityPath()
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [threads, setThreads] = useState<MarketThreadSummary[] | 'error' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const format = useFormat()

  const loadThreads = useCallback(() => {
    setThreads(null)
    fetchMarketThreads('selling', post.id)
      .then(setThreads)
      .catch(() => setThreads('error'))
  }, [post.id])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  const changeStatus = async (status: MarketStatus) => {
    if (busy || status === (post.marketStatus ?? 'selling')) return
    setBusy(true)
    try {
      onChange(await setMarketStatus(post.id, status))
      toast.success(t('ellieoMarket.detail.statusSaved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy || !window.confirm(t('ellieoMarket.detail.deleteConfirm'))) return
    setBusy(true)
    try {
      await deleteMarketListing(post.id)
      toast.success(t('ellieoMarket.detail.deleted'))
      router.replace(href('/marketplace'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
      setBusy(false)
    }
  }

  return (
    <>
      <section className='mt-6 border-t border-[var(--border)] pt-4'>
        <p className='text-[13px] font-semibold text-[var(--muted-foreground)]'>{t('ellieoMarket.detail.statusLabel')}</p>
        <div role='radiogroup' className='mt-2 grid grid-cols-3 gap-1 rounded-full bg-[var(--surface)] p-1'>
          {MARKET_STATUSES.map((status) => {
            const active = (post.marketStatus ?? 'selling') === status
            return (
              <button
                key={status}
                type='button'
                role='radio'
                aria-checked={active}
                disabled={busy}
                onClick={() => void changeStatus(status)}
                className={cn(
                  'h-10 rounded-full text-[14px] font-semibold transition',
                  active ? 'bg-[var(--brand)] text-white' : 'text-[var(--foreground)] hover:bg-white',
                )}
              >
                {t(`ellieoMarket.status.${status}`)}
              </button>
            )
          })}
        </div>
        <div className='mt-3 grid grid-cols-2 gap-2'>
          <Link
            href={href(`/marketplace/${encodeURIComponent(post.id)}/edit`)}
            className='flex h-11 items-center justify-center rounded-full bg-[var(--surface)] text-[15px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--border)]'
          >
            {t('ellieoMarket.detail.edit')}
          </Link>
          <button
            type='button'
            onClick={() => void remove()}
            disabled={busy}
            className='h-11 rounded-full bg-[var(--surface)] text-[15px] font-semibold text-[var(--ellieo-danger)] transition hover:bg-[var(--border)]'
          >
            {t('ellieoMarket.detail.delete')}
          </button>
        </div>
      </section>

      <section className='mt-5 border-t border-[var(--border)] pt-4'>
        <h2 className='text-[17px] font-bold text-[var(--foreground)]'>{t('ellieoMarket.ask.threads')}</h2>
        {threads === null ? (
          <div className='flex justify-center py-6'>
            <EllieoDots />
          </div>
        ) : threads === 'error' ? (
          <LoadFailed onRetry={loadThreads} />
        ) : threads.length === 0 ? (
          <p className='mt-2 text-[14px] text-[var(--muted-foreground)]'>{t('ellieoMarket.ask.noThreads')}</p>
        ) : (
          <ul className='mt-2 divide-y divide-[var(--border)]'>
            {threads.map((thread) => (
              <li key={thread.id} className='py-2'>
                <button
                  type='button'
                  onClick={() => {
                    setOpenId((id) => (id === thread.id ? null : thread.id))
                    // Opening the thread marks it read on the server; clear the badge here too
                    setThreads((prev) =>
                      Array.isArray(prev) ? prev.map((item) => (item.id === thread.id ? { ...item, unread: 0 } : item)) : prev,
                    )
                  }}
                  aria-expanded={openId === thread.id}
                  className='flex w-full items-center gap-3 py-1.5 text-left'
                >
                  <EllieoPersonAvatar name={thread.otherNickname || '?'} photo={thread.otherPhoto ?? null} />
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-center gap-2 text-[14.5px] font-bold text-[var(--foreground)]'>
                      {thread.otherNickname || '?'}
                      {thread.unread ? (
                        <span className='rounded-full bg-[var(--brand)] px-1.5 text-[11px] font-bold text-white tabular-nums'>{thread.unread}</span>
                      ) : null}
                    </span>
                    <span className='block truncate text-[13px] text-[var(--muted-foreground)]'>
                      {thread.lastMessage || ''}
                      {thread.lastMessageAt ? ` · ${format.relative(thread.lastMessageAt)}` : ''}
                    </span>
                  </span>
                  <ChevronRightIcon className={cn('size-4 text-[var(--muted)] transition', openId === thread.id && 'rotate-90')} />
                </button>
                {openId === thread.id ? (
                  <div className='pb-2 pt-1'>
                    <MarketThread threadId={thread.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const t = useT('community')
  return (
    <div role='alert' className='mt-3 flex items-center justify-between gap-3 rounded-[1rem] bg-[#fdecef] px-4 py-3'>
      <p className='text-[14px] font-medium text-[var(--ellieo-danger)]'>{t('ellieoMarket.ask.loadFailed')}</p>
      <button
        type='button'
        onClick={onRetry}
        className='h-9 shrink-0 rounded-full bg-white px-4 text-[14px] font-semibold text-[var(--foreground)] shadow-[0_0_0_1px_var(--border)]'
      >
        {t('ellieoMarket.ask.retry')}
      </button>
    </div>
  )
}
