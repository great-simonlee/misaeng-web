'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { LoadingState } from '@components'
import { useCity, useCityPath } from '@hooks/useCity'
import { useRequireAuth } from '@hooks/useRequireAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { fetchCommunityPost } from '@lib/community/client'
import {
  MARKET_CATEGORIES,
  MARKET_PAYMENTS,
  MARKET_PHOTO_MAX,
  MARKET_PRICE_MAX,
  MARKET_STATUSES,
  normalizeMarketZip,
  type MarketCategory,
  type MarketPayment,
  type MarketStatus,
} from '@lib/community/marketplace'
import { canWriteOnBoard, isAccountSuspended } from '@lib/community/schoolGate'
import { uploadCommunityImageFile } from '@lib/community/upload.client'
import { hrefForCommunityPost } from '@lib/constants/cities'
import { useT } from '@lib/i18n/client'
import type { CommunityPost } from '@/types/nyc'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { BoardBackLink, BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { MarketZipMap } from '@widgets/nyc/MarketZipMap'
import { SchoolVerificationRequired } from '@widgets/nyc/SchoolVerificationRequired'

/**
 * 중고거래 물건 올리기 / 수정 on the web (owner 11-23) — the same fields and rules as the app's MarketWriteView:
 * photos (up to 6, first = cover), title, price or 무료 나눔, payment methods, category, ZIP only, optional description,
 * 안전 거래 수칙 agreement. POST /api/community (board marketplace) / PATCH /api/community/{id}.
 */

const TITLE_MAX = 60
const AGREED_KEY = 'misaeng.marketRulesAgreedAt'
const AGREED_TTL = 24 * 60 * 60 * 1000
const BODY_MAX = 2000
const PRICE_MAX_LABEL = `$${MARKET_PRICE_MAX.toLocaleString('en-US')}`
// Phone numbers, emails, messenger IDs in the text (the app warns the same way; the server doesn't block)
const CONTACT_PATTERN = /(\d{3}[\s.-]?\d{3,4}[\s.-]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)|(kakao|카톡|카카오|whatsapp|wechat|위챗|텔레그램|telegram)/i

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
const toPlain = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()

export function MarketWriteScreen({ editPostId }: { editPostId?: string }) {
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const router = useRouter()
  const { error: toastError, success } = useToast()
  const isEdit = Boolean(editPostId)
  const loginNext = editPostId ? href(`/marketplace/${editPostId}/edit`) : href('/marketplace/new')
  const { user, profile, loading } = useRequireAuth(loginNext)

  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [photos, setPhotos] = useState<string[]>([])
  const [pending, setPending] = useState(0)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [free, setFree] = useState(false)
  const [payments, setPayments] = useState<MarketPayment[]>([])
  const [category, setCategory] = useState<MarketCategory | null>(null)
  const [zip, setZip] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<MarketStatus>('selling')
  const [agreed, setAgreed] = useState(isEdit)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  // 안전 거래 수칙 + 커뮤니티 규칙: a modal on arrival; agreeing is remembered for 24 hours on this browser (same as the app)
  useEffect(() => {
    if (isEdit || !user) return
    let recent = false
    try {
      recent = Date.now() - Number(localStorage.getItem(`${AGREED_KEY}:${user.uid}`) || 0) < AGREED_TTL
    } catch {}
    if (recent) setAgreed(true)
    else setRulesOpen(true)
  }, [isEdit, user])

  function agree() {
    setAgreed(true)
    setRulesOpen(false)
    try {
      if (user) localStorage.setItem(`${AGREED_KEY}:${user.uid}`, String(Date.now()))
    } catch {}
  }

  // Edit: load the listing (only its author can open this)
  useEffect(() => {
    if (!editPostId || !user) return
    let alive = true
    void fetchCommunityPost(editPostId)
      .then((post: CommunityPost | null) => {
        if (!alive) return
        if (!post || post.categoryId !== 'marketplace' || post.authorUid !== user.uid) {
          router.replace(href('/marketplace'))
          return
        }
        setPhotos((post.galleryPhotos ?? []).map((photo) => photo.imageUrl).filter(Boolean).slice(0, MARKET_PHOTO_MAX))
        setTitle(post.title)
        setFree(post.price === 0)
        setPrice(post.price && post.price > 0 ? String(post.price) : '')
        setPayments((post.marketPayments ?? []).filter((id): id is MarketPayment => (MARKET_PAYMENTS as readonly string[]).includes(id)))
        setCategory((MARKET_CATEGORIES as readonly string[]).includes(post.marketCategory ?? '') ? (post.marketCategory as MarketCategory) : null)
        setZip(normalizeMarketZip(post.location) ?? '')
        setBody(toPlain(post.contentHtml || ''))
        setStatus(post.marketStatus ?? 'selling')
      })
      .catch(() => router.replace(href('/marketplace')))
      .finally(() => alive && setLoadingEdit(false))
    return () => {
      alive = false
    }
  }, [editPostId, user, router, href])

  const priceValue = free ? 0 : /^\d+$/.test(price.trim()) ? Number(price.trim()) : null
  const zipValue = normalizeMarketZip(zip)
  const missing = [
    !category ? t('market.category') : null,
    !title.trim() ? t('market.titleLabel') : null,
    priceValue == null ? t('market.price') : null,
    photos.length === 0 && pending === 0 ? t('market.photos') : null,
    pending > 0 ? t('market.uploading') : null,
    !free && payments.length === 0 ? t('market.payment') : null,
    !zipValue ? t('market.zip') : null,
  ].filter((item): item is string => Boolean(item))
  const contactFound = CONTACT_PATTERN.test(title) || CONTACT_PATTERN.test(body)
  const canSubmit = missing.length === 0 && agreed && !submitting

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const room = MARKET_PHOTO_MAX - photos.length - pending
    const picked = Array.from(files).slice(0, Math.max(0, room))
    if (fileInput.current) fileInput.current.value = ''
    setPending((n) => n + picked.length)
    let failed = 0
    for (const file of picked) {
      try {
        const url = await uploadCommunityImageFile(file, t)
        setPhotos((current) => (current.length < MARKET_PHOTO_MAX && !current.includes(url) ? [...current, url] : current))
      } catch {
        failed += 1
      }
      setPending((n) => n - 1)
    }
    if (failed) toastError(t('market.uploadFailed'))
  }

  function movePhoto(index: number, to: number) {
    setPhotos((current) => {
      if (to < 0 || to >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || priceValue == null || !category || !zipValue) return
    setSubmitting(true)
    const payload = {
      ...(isEdit ? {} : { categoryId: 'marketplace', city }),
      title: title.trim(),
      contentHtml: toHtml(body),
      location: zipValue,
      price: priceValue,
      marketCategory: category,
      marketPayments: free ? [] : MARKET_PAYMENTS.filter((id) => payments.includes(id)),
      ...(isEdit ? { marketStatus: status } : {}),
      thumbnailUrl: photos[0] ?? null,
      galleryPhotos: photos.map((imageUrl, index) => ({ id: `gallery_${index + 1}`, imageUrl, caption: '' })),
    }
    try {
      const res = await fetch(isEdit ? `/api/community/${editPostId}` : '/api/community', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => null)) as { post?: CommunityPost; error?: string } | null
      if (!res.ok || !data?.post) throw new Error(data?.error || t('market.createFailed'))
      success(isEdit ? t('market.updated') : data.post.pendingApproval ? t('market.heldCreated') : t('market.created'))
      router.replace(hrefForCommunityPost(data.post, city))
    } catch (error) {
      toastError(getErrorMessage(error, t('market.createFailed')))
      setSubmitting(false)
    }
  }

  if (loading || loadingEdit || !user) {
    return (
      <BoardPageShell width='narrow'>
        <LoadingState fullPage />
      </BoardPageShell>
    )
  }
  if (isAccountSuspended(profile)) return <AccountSuspendedNotice />
  // 학교·직장 인증 회원만 (학부모는 질문·자유만) — the same gate as the server and the app's canSell
  if (!canWriteOnBoard(profile, 'marketplace')) return <SchoolVerificationRequired nextPath={loginNext} boardId='marketplace' />

  const chip = (on: boolean, disabled = false) =>
    cn(
      'inline-flex h-11 items-center justify-center rounded-2xl px-4 text-[14px] font-semibold ring-1 transition touch-manipulation',
      on ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]' : 'bg-white text-[var(--foreground)] ring-black/[0.08] hover:ring-black/20',
      disabled && 'pointer-events-none opacity-40',
    )
  const input =
    'h-12 w-full rounded-2xl bg-white px-4 text-[15px] text-[var(--foreground)] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'

  const photoSection = (
    <Section step={3} title={t('market.photos')} trailing={`${photos.length}/${MARKET_PHOTO_MAX}`}>
      <div className='grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-2'>
        {photos.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={(e) => {
              setDragFrom(index)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragFrom != null && dragFrom !== index) {
                movePhoto(dragFrom, index)
                setDragFrom(index)
              }
            }}
            onDragEnd={() => setDragFrom(null)}
            onDrop={(e) => e.preventDefault()}
            className={cn(
              'group relative aspect-square cursor-grab overflow-hidden rounded-2xl bg-[#f1f2f4] transition active:cursor-grabbing',
              index === 0 ? 'ring-[3px] ring-[var(--brand)] ring-offset-2' : 'ring-1 ring-black/[0.06]',
              dragFrom === index && 'scale-[0.97] opacity-60',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo preview */}
            <img src={url} alt='' draggable={false} className='pointer-events-none size-full object-cover' />
            {index === 0 ? (
              <span className='absolute inset-x-0 bottom-0 flex h-6 items-center justify-center gap-1 bg-[var(--brand)] text-[11px] font-bold text-white sm:h-[22px] lg:h-6 lg:text-[12px]'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='size-3 shrink-0' aria-hidden>
                  <path d='M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z' />
                </svg>
                {t('market.cover')}
              </span>
            ) : (
              <span className='absolute bottom-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-[11px] font-bold text-white'>
                {index + 1}
              </span>
            )}
            {/* Touch screens (no drag): move buttons */}
            <div className='absolute right-1.5 top-10 hidden flex-col gap-1 [@media(hover:none)]:flex'>
              {index > 0 ? (
                <button type='button' onClick={() => movePhoto(index, index - 1)} aria-label='←' className='size-7 rounded-full bg-white/90 text-[13px] font-bold shadow'>
                  ‹
                </button>
              ) : null}
              {index < photos.length - 1 ? (
                <button type='button' onClick={() => movePhoto(index, index + 1)} aria-label='→' className='size-7 rounded-full bg-white/90 text-[13px] font-bold shadow'>
                  ›
                </button>
              ) : null}
            </div>
            <button
              type='button'
              onClick={() => setPhotos((current) => current.filter((item) => item !== url))}
              aria-label={t('market.removePhoto')}
              className='absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-[14px] text-white opacity-90 transition hover:bg-black/80'
            >
              ×
            </button>
          </div>
        ))}
        {Array.from({ length: pending }, (_, i) => (
          <div key={`pending-${i}`} className='flex aspect-square items-center justify-center rounded-2xl bg-[#f1f2f4]'>
            <span className='size-5 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent' />
          </div>
        ))}
        {photos.length + pending < MARKET_PHOTO_MAX ? (
          <button
            type='button'
            onClick={() => fileInput.current?.click()}
            className='flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/[0.12] bg-white text-[13px] font-semibold text-[var(--muted-foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]'
          >
            <span className='text-[22px] leading-none'>+</span>
            {t('market.addPhoto')}
          </button>
        ) : null}
      </div>
      <input ref={fileInput} type='file' accept='image/*' multiple hidden onChange={(e) => void addPhotos(e.target.files)} />
      <p className='mt-3 text-[12.5px] text-[var(--muted)]'>{photos.length > 1 ? t('market.dragHint') : t('market.photosHint')}</p>
    </Section>
  )

  const submitButton = (
    <>
      {missing.length > 0 ? (
        <p className='mb-2 text-center text-[12.5px] text-[var(--muted)] lg:text-left'>{t('market.missing', { items: missing.join(', ') })}</p>
      ) : null}
      <button
        type='submit'
        disabled={!canSubmit}
        className='w-full rounded-full bg-[var(--brand)] py-3.5 text-[16px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)] disabled:opacity-40 disabled:shadow-none'
      >
        {submitting ? t('market.saving') : isEdit ? t('market.saveEdit') : t('market.submit')}
      </button>
    </>
  )

  return (
    <BoardPageShell width='wide'>
      <form onSubmit={handleSubmit} className='pb-28 pt-4 sm:pt-5 lg:pb-16 lg:pt-6'>
        <BoardBackLink
          href={isEdit && editPostId ? href(`/marketplace/${editPostId}`) : href('/marketplace')}
          label={isEdit ? t('write.backToPost') : t('detail.backToList', { board: t('categories.marketplace.title') })}
          className='mb-4'
        />
        <h1 className='text-[1.75rem] font-bold leading-[1.1] tracking-[-0.035em] text-[var(--foreground)] sm:text-[2.1rem] lg:text-[2.5rem]'>
          {isEdit ? t('market.editTitle') : t('market.writeTitle')}
        </h1>
        <p className='mt-3 text-[14px] text-[var(--muted)] lg:text-[15px]'>{t('market.writeIntro')}</p>

        {/* Desktop: what you're selling on the left, trade details + submit in a sticky column on the right */}
        <div className='mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8'>
          <div className='flex min-w-0 flex-col gap-4'>
            {/* 1. What kind of item: picked first (owner 11-23) */}
            <Section step={1} title={t('market.category')}>
              <div className='flex flex-wrap gap-2'>
                {MARKET_CATEGORIES.map((id) => (
                  <button key={id} type='button' aria-pressed={category === id} onClick={() => setCategory(id)} className={chip(category === id)}>
                    {t(`market.categories.${id}`)}
                  </button>
                ))}
              </div>
            </Section>

            <Section step={2} title={t('market.titlePriceLabel')}>
              {/* Phones: title on its own line; tablet and up: title · price · 무료 나눔 on one line */}
              <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3'>
                <label className='block min-w-0 sm:flex-1'>
                  <span className='sr-only'>{t('market.titleLabel')}</span>
                  <span className='relative block'>
                    <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))} maxLength={TITLE_MAX} placeholder={t('market.titlePlaceholder')} className={cn(input, 'pr-16')} />
                    <span className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] tabular-nums text-[var(--muted)]'>
                      {title.length}/{TITLE_MAX}
                    </span>
                  </span>
                </label>
                <div className='flex items-center gap-3'>
                  <div className={cn('relative flex-1 sm:w-40 sm:flex-none', free && 'opacity-40')}>
                    <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[var(--muted)]'>$</span>
                    <input
                      value={free ? '' : price}
                      onChange={(e) => setPrice(String(Math.min(Number(e.target.value.replace(/\D/g, '').slice(0, 6) || 0), MARKET_PRICE_MAX) || ''))}
                      inputMode='numeric'
                      disabled={free}
                      placeholder={t('market.pricePlaceholder')}
                      aria-label={t('market.price')}
                      className={cn(input, 'pl-8')}
                    />
                  </div>
                  <label className='flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-[var(--foreground)]'>
                    <input type='checkbox' checked={free} onChange={(e) => setFree(e.target.checked)} className='size-5 accent-[var(--brand)]' />
                    {t('market.priceFree')}
                  </label>
                </div>
              </div>
              <p className='mt-2 text-[12px] text-[var(--muted)]'>{t('market.priceLimit', { max: PRICE_MAX_LABEL })}</p>
            </Section>

            {photoSection}


            <Section step={4} title={t('market.bodyLabel')}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={8}
                placeholder={t('market.bodyPlaceholder')}
                className='w-full resize-y rounded-2xl bg-white px-4 py-3 text-[15px] leading-relaxed text-[var(--foreground)] outline-none ring-1 ring-black/[0.08] placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'
              />
              <p className='mt-1.5 text-right text-[12px] tabular-nums text-[var(--muted)]'>
                {body.length.toLocaleString('en-US')}/{BODY_MAX.toLocaleString('en-US')}
              </p>
              {contactFound ? (
                <p className='mt-2 rounded-xl bg-[#FFF4E5] px-3 py-2.5 text-[13px] font-medium text-[#9A5B00]'>{t('market.contactWarning')}</p>
              ) : null}
            </Section>

          </div>

          <div className='flex flex-col gap-4'>
            <section className='rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6'>
              <h2 className='text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>{t('market.details')}</h2>

              <p className='mt-4 text-[13px] font-semibold text-[var(--foreground)]'>{t('market.payment')}</p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {MARKET_PAYMENTS.map((id) => (
                  <button
                    key={id}
                    type='button'
                    aria-pressed={!free && payments.includes(id)}
                    onClick={() => setPayments((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
                    className={chip(!free && payments.includes(id), free)}
                  >
                    {t(`market.payments.${id}`)}
                  </button>
                ))}
              </div>
              <p className='mt-1.5 text-[12px] text-[var(--muted)]'>{t(free ? 'market.paymentFree' : 'market.paymentHint')}</p>

              <p className='mt-5 text-[13px] font-semibold text-[var(--foreground)]'>{t('market.zip')}</p>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                inputMode='numeric'
                placeholder={t('market.zipPlaceholder')}
                className={cn(input, 'mt-2 max-w-[12rem]')}
              />
              <p className='mt-1.5 text-[12px] text-[var(--muted)]'>{t('market.zipHint')}</p>
              <MarketZipMap zip={zip} className='mt-3' />

              {isEdit ? (
                <>
                  <p className='mt-5 text-[13px] font-semibold text-[var(--foreground)]'>{t('market.statusLabel')}</p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {MARKET_STATUSES.map((id) => (
                      <button key={id} type='button' aria-pressed={status === id} onClick={() => setStatus(id)} className={chip(status === id)}>
                        {t(`market.status.${id}`)}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            <CommunityWritingGuidelines />

            {/* Submit (desktop) + the rules again; the agreement itself is the modal on open */}
            <section className='rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6'>
              <div className='hidden lg:block'>{submitButton}</div>
              <button
                type='button'
                onClick={() => setRulesOpen(true)}
                className='flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand)] lg:mt-4'
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-4' aria-hidden>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z' />
                </svg>
                {t('market.rulesAgain')}
              </button>
              <p className='mt-2 text-[12px] text-[var(--muted)]'>{t('market.inquiryInApp')}</p>
            </section>
          </div>
        </div>

        {rulesOpen ? (
          <MarketRulesModal
            agreed={agreed}
            onAgree={agree}
            onClose={() => (agreed ? setRulesOpen(false) : router.replace(href('/marketplace')))}
          />
        ) : null}

        {/* Phones and tablets: submit bar pinned to the bottom */}
        <div className='fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden'>
          {submitButton}
        </div>
      </form>
    </BoardPageShell>
  )
}

function MarketRulesModal({ agreed, onAgree, onClose }: { agreed: boolean; onAgree: () => void; onClose: () => void }) {
  const t = useT('community')
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className='fixed inset-0 z-[10050] flex items-end justify-center bg-black/45 sm:items-center sm:p-6' onClick={onClose}>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='market-rules-title'
        onClick={(e) => e.stopPropagation()}
        className='flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]'
      >
        <div className='overflow-y-auto px-5 pb-4 pt-6 sm:px-7'>
          <span className='flex size-11 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[var(--brand)]'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-6' aria-hidden>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z' />
            </svg>
          </span>
          <h2 id='market-rules-title' className='mt-3 text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--foreground)]'>
            {t('market.consentTitle')}
          </h2>
          <p className='mt-1 text-[13.5px] text-[var(--muted)]'>{t('market.agreeIntro')}</p>

          <h3 className='mt-5 text-[14px] font-bold text-[var(--foreground)]'>{t('market.safetyTitle')}</h3>
          <ol className='mt-2 space-y-2.5'>
            {['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'].map((key, index) => (
              <li key={key} className='flex gap-3 text-[13.5px] leading-relaxed'>
                <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] text-[11px] font-bold text-[var(--brand)]'>{index + 1}</span>
                <span>
                  <span className='font-semibold text-[var(--foreground)]'>{t(`market.safetyRules.${key}Title`)}</span>
                  <span className='block text-[var(--muted-foreground)]'>{t(`market.safetyRules.${key}`)}</span>
                </span>
              </li>
            ))}
          </ol>

          <CommunityWritingGuidelines className='mt-5' />

          <p className='mt-4 rounded-xl bg-[#f5f6f8] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
            <span className='font-semibold text-[var(--foreground)]'>{t('market.disclaimerTitle')} · </span>
            {t('market.disclaimer')}
          </p>
        </div>
        <div className='flex gap-2.5 border-t border-black/[0.06] px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 sm:px-7 sm:pb-5'>
          {agreed ? (
            <button type='button' onClick={onClose} className='h-12 flex-1 rounded-full bg-[var(--foreground)] text-[15px] font-bold text-white'>
              {t('market.consentAgree')}
            </button>
          ) : (
            <>
              <button type='button' onClick={onClose} className='h-12 rounded-full bg-[#F4F5F7] px-5 text-[15px] font-semibold text-[var(--foreground)]'>
                {t('market.consentCancel')}
              </button>
              <button
                type='button'
                onClick={onAgree}
                className='h-12 flex-1 rounded-full bg-[var(--brand)] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(246,67,16,0.7)] transition hover:bg-[var(--brand-hover)]'
              >
                {t('market.consentAgree')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ step, title, trailing, children }: { step?: number; title: string; trailing?: string; children: ReactNode }) {
  return (
    <section className='rounded-[1.375rem] bg-white p-5 ring-1 ring-[var(--card-ring)] sm:p-6'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-[16px] font-bold tracking-[-0.02em] text-[var(--foreground)]'>
          {step ? (
            <span className='flex size-6 items-center justify-center rounded-full bg-[#FFF1E8] text-[12px] font-extrabold text-[var(--brand)]'>{step}</span>
          ) : null}
          {title}
        </h2>
        {trailing ? <span className='text-[13px] font-semibold text-[var(--muted)]'>{trailing}</span> : null}
      </div>
      {children}
    </section>
  )
}
