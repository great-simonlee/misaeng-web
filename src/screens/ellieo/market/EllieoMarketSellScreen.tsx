'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { EllieoDots } from '@components/EllieoDots'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
import {
  MARKET_CATEGORIES,
  MARKET_PAYMENTS,
  MARKET_PHOTO_MAX,
  MARKET_PRICE_MAX,
  normalizeMarketZip,
} from '@lib/community/marketplace'
import {
  createMarketListing,
  fetchMarketPost,
  lookupMarketZip,
  updateMarketListing,
  type MarketListingInput,
} from '@lib/community/marketplace.client'
import { uploadCommunityImageFile } from '@lib/community/upload.client'
import { cityLoginPath } from '@lib/constants/cities'
import { IMAGE_LIBRARY_ACCEPT } from '@lib/constants/imageUpload'
import { useT } from '@lib/i18n/client'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import { BagIcon, CloseIcon, PlusIcon } from '@widgets/ellieo/icons'

const TITLE_MAX = 60
const BODY_MAX = 2000
const CONTACT_PATTERN = /(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)/

type Errors = Partial<Record<'photos' | 'title' | 'category' | 'price' | 'payments' | 'zip', string>>

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

/** Sell (or edit) a marketplace item — same fields and limits as the app's MarketWriteView */
export function EllieoMarketSellScreen({ editPostId }: { editPostId?: string }) {
  const t = useT('community')
  const city = useCity()
  const href = useCityPath()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)

  const [loaded, setLoaded] = useState(!editPostId)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('')
  const [free, setFree] = useState(false)
  const [price, setPrice] = useState('')
  const [payments, setPayments] = useState<string[]>([])
  const [zip, setZip] = useState('')
  const [zipMissing, setZipMissing] = useState(false)
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editPostId || !user) return
    let alive = true
    fetchMarketPost(editPostId)
      .then((post) => {
        if (!alive) return
        if (!post || post.authorUid !== user.uid) {
          router.replace(href(`/marketplace/${encodeURIComponent(editPostId)}`))
          return
        }
        const gallery = (post.galleryPhotos ?? []).map((photo) => photo.imageUrl).filter(Boolean)
        setPhotos(gallery.length ? gallery : post.thumbnailUrl ? [post.thumbnailUrl] : [])
        setTitle(post.title)
        setCategory(post.marketCategory ?? '')
        setFree(post.price === 0)
        setPrice(post.price ? String(post.price) : '')
        setPayments(post.marketPayments ?? [])
        setZip(normalizeMarketZip(post.location) ?? '')
        setBody(htmlToText(post.contentHtml || ''))
        setLoaded(true)
      })
      .catch(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [editPostId, user, router, href])

  if (authLoading || (user && !loaded)) {
    return (
      <Shell>
        <div className='flex justify-center py-24'>
          <EllieoDots />
        </div>
      </Shell>
    )
  }

  if (!user) {
    const here = href(editPostId ? `/marketplace/${encodeURIComponent(editPostId)}/edit` : '/marketplace/new')
    return (
      <Shell>
        <div className='mt-4 flex flex-col items-center rounded-[1.75rem] bg-[var(--surface)] px-6 py-12 text-center'>
          <EllieoIconBadge icon={BagIcon} />
          <p className='mt-4 text-[18px] font-bold text-[var(--foreground)]'>{t('ellieoMarket.form.loginTitle')}</p>
          <p className='mt-1 text-[14px] text-[var(--muted-foreground)]'>{t('ellieoMarket.form.loginBody')}</p>
          <Link
            href={cityLoginPath(city, here)}
            className='mt-5 inline-flex h-11 items-center rounded-full bg-[var(--brand)] px-6 text-[15px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
          >
            {t('ellieoMarket.form.login')}
          </Link>
        </div>
      </Shell>
    )
  }

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const room = MARKET_PHOTO_MAX - photos.length
    const picked = Array.from(files).slice(0, Math.max(0, room))
    setUploading((n) => n + picked.length)
    for (const file of picked) {
      try {
        const url = await uploadCommunityImageFile(file, t)
        setPhotos((prev) => (prev.length < MARKET_PHOTO_MAX ? [...prev, url] : prev))
        setErrors((prev) => ({ ...prev, photos: undefined }))
      } catch (err) {
        setFormError(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const checkZip = async () => {
    const normalized = normalizeMarketZip(zip)
    if (!normalized) return
    setZipMissing((await lookupMarketZip(normalized)) === false)
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (photos.length === 0) next.photos = t('ellieoMarket.form.errors.photos')
    if (!title.trim()) next.title = t('ellieoMarket.form.errors.title')
    else if (title.trim().length > TITLE_MAX) next.title = t('ellieoMarket.form.errors.titleLong')
    if (!category) next.category = t('ellieoMarket.form.errors.category')
    const priceValue = Number(price.replace(/[$,\s]/g, ''))
    if (!free && (!price.trim() || !Number.isFinite(priceValue) || priceValue <= 0 || priceValue > MARKET_PRICE_MAX)) {
      next.price = t('ellieoMarket.form.errors.price')
    }
    if (!free && payments.length === 0) next.payments = t('ellieoMarket.form.errors.payments')
    if (!normalizeMarketZip(zip)) next.zip = t('ellieoMarket.form.errors.zip')
    return next
  }

  const submit = async () => {
    if (saving || uploading > 0) return
    const next = validate()
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return
    const input: MarketListingInput = {
      title: title.trim(),
      contentHtml: textToHtml(body.slice(0, BODY_MAX)),
      location: normalizeMarketZip(zip)!,
      price: free ? 0 : Math.round(Number(price.replace(/[$,\s]/g, ''))),
      marketCategory: category,
      marketPayments: free ? [] : MARKET_PAYMENTS.filter((id) => payments.includes(id)),
      thumbnailUrl: photos[0] ?? null,
      galleryPhotos: photos.map((imageUrl, index) => ({ id: `gallery_${index + 1}`, imageUrl, caption: '' })),
    }
    setSaving(true)
    try {
      const post = editPostId ? await updateMarketListing(editPostId, input) : await createMarketListing(city, input)
      router.push(href(`/marketplace/${encodeURIComponent(post.id)}`))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('ellieoMarket.form.errors.generic'))
      setSaving(false)
    }
  }

  const hasContact = CONTACT_PATTERN.test(`${title}\n${body}`)

  return (
    <Shell>
      <Link
        href={href(editPostId ? `/marketplace/${encodeURIComponent(editPostId)}` : '/marketplace')}
        className='inline-flex items-center gap-1 text-[14px] font-medium text-[var(--muted-foreground)]'
      >
        <span aria-hidden>‹</span> {t('ellieoMarket.detail.back')}
      </Link>
      <h1 className='mt-3 text-[26px] font-bold tracking-[-0.03em] text-[var(--foreground)]'>
        {editPostId ? t('ellieoMarket.form.editTitle') : t('ellieoMarket.form.newTitle')}
      </h1>

      <form
        className='mt-5 flex flex-col gap-6'
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label={t('ellieoMarket.form.photos')} hint={t('ellieoMarket.form.photosHint')} error={errors.photos}>
          <div className='flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]'>
            {photos.map((src, index) => (
              <div key={src} className='relative size-24 shrink-0 overflow-hidden rounded-[1rem] bg-[var(--surface)]'>
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
                <img src={src} alt='' className='size-full object-cover' />
                <button
                  type='button'
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={t('ellieoMarket.form.removePhoto')}
                  className='absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white'
                >
                  <CloseIcon className='size-3.5' strokeWidth={2.4} />
                </button>
              </div>
            ))}
            {uploading > 0 ? (
              <div className='flex size-24 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--surface)]'>
                <EllieoDots label={t('ellieoMarket.form.uploading')} />
              </div>
            ) : null}
            {photos.length + uploading < MARKET_PHOTO_MAX ? (
              <button
                type='button'
                onClick={() => fileInput.current?.click()}
                className='flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-[1rem] border border-dashed border-[var(--brand-subtle)] bg-[var(--brand-soft)] text-[12px] font-semibold text-[var(--brand)]'
              >
                <PlusIcon className='size-5' strokeWidth={2.2} />
                {t('ellieoMarket.form.addPhoto')}
                <span className='text-[11px] font-medium tabular-nums text-[var(--muted)]'>
                  {photos.length}/{MARKET_PHOTO_MAX}
                </span>
              </button>
            ) : null}
          </div>
          <input
            ref={fileInput}
            type='file'
            accept={IMAGE_LIBRARY_ACCEPT}
            multiple
            hidden
            onChange={(event) => {
              void addFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </Field>

        <Field label={t('ellieoMarket.form.title')} error={errors.title} counter={`${title.length}/${TITLE_MAX}`}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX))}
            placeholder={t('ellieoMarket.form.titlePlaceholder')}
            className={inputClass}
          />
        </Field>

        <Field label={t('ellieoMarket.form.category')} error={errors.category}>
          <div className='flex flex-wrap gap-2'>
            {MARKET_CATEGORIES.map((id) => (
              <Chip key={id} active={category === id} onClick={() => setCategory(id)}>
                {t(`ellieoMarket.categories.${id}`)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label={t('ellieoMarket.form.price')} error={errors.price}>
          <div className='flex items-center gap-2'>
            <div className={cn('relative flex-1', free && 'opacity-45')}>
              <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[var(--muted-foreground)]'>$</span>
              <input
                value={free ? '' : price}
                disabled={free}
                inputMode='numeric'
                onChange={(event) => setPrice(event.target.value.replace(/[^\d,]/g, ''))}
                placeholder={t('ellieoMarket.form.pricePlaceholder')}
                className={cn(inputClass, 'pl-8 tabular-nums')}
              />
            </div>
          </div>
          <label className='mt-2.5 inline-flex cursor-pointer items-center gap-2 text-[14.5px] font-medium text-[var(--foreground)]'>
            <input
              type='checkbox'
              checked={free}
              onChange={(event) => setFree(event.target.checked)}
              className='size-5 accent-[var(--brand)]'
            />
            {t('ellieoMarket.form.free')}
          </label>
        </Field>

        {free ? null : (
          <Field label={t('ellieoMarket.form.payments')} error={errors.payments}>
            <div className='flex flex-wrap gap-2'>
              {MARKET_PAYMENTS.map((id) => (
                <Chip
                  key={id}
                  active={payments.includes(id)}
                  onClick={() => setPayments((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))}
                >
                  {t(`ellieoMarket.payments.${id}`)}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        <Field
          label={t('ellieoMarket.form.zip')}
          hint={zipMissing ? undefined : t('ellieoMarket.form.zipHint')}
          error={errors.zip ?? (zipMissing ? t('ellieoMarket.form.zipNotFound') : undefined)}
        >
          <input
            value={zip}
            inputMode='numeric'
            autoComplete='postal-code'
            onChange={(event) => {
              setZip(event.target.value.replace(/[^\d-]/g, '').slice(0, 10))
              setZipMissing(false)
            }}
            onBlur={() => void checkZip()}
            placeholder={t('ellieoMarket.form.zipPlaceholder')}
            className={cn(inputClass, 'max-w-[10rem] tabular-nums')}
          />
        </Field>

        <Field label={t('ellieoMarket.form.description')} counter={`${body.length}/${BODY_MAX}`}>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
            placeholder={t('ellieoMarket.form.descriptionPlaceholder')}
            rows={6}
            className={cn(inputClass, 'h-auto resize-y py-3 leading-relaxed')}
          />
        </Field>

        {hasContact ? (
          <p className='rounded-[1rem] bg-[var(--brand-soft)] px-4 py-3 text-[13.5px] text-[var(--brand-deep)]'>
            {t('ellieoMarket.form.contactWarning')}
          </p>
        ) : null}
        {formError ? (
          <p role='alert' className='rounded-[1rem] bg-[#fdecef] px-4 py-3 text-[13.5px] font-medium text-[var(--ellieo-danger)]'>
            {formError}
          </p>
        ) : null}

        <button
          type='submit'
          disabled={saving || uploading > 0}
          className='flex h-12 items-center justify-center rounded-full bg-[var(--brand)] text-[16px] font-bold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-60'
        >
          {saving ? t('ellieoMarket.form.saving') : editPostId ? t('ellieoMarket.form.save') : t('ellieoMarket.form.submit')}
        </button>
      </form>
    </Shell>
  )
}

const inputClass =
  'h-12 w-full rounded-[1rem] bg-[var(--surface)] px-4 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--brand)]'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[36rem] px-4 pb-28 pt-4 lg:pt-8'>{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  counter,
  children,
}: {
  label: string
  hint?: string
  error?: string
  counter?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className='mb-2 flex items-baseline justify-between gap-3'>
        <span className='text-[14.5px] font-semibold text-[var(--foreground)]'>{label}</span>
        {counter ? <span className='text-[12px] tabular-nums text-[var(--muted)]'>{counter}</span> : null}
      </div>
      {children}
      {error ? (
        <p className='mt-1.5 text-[13px] font-medium text-[var(--ellieo-danger)]'>{error}</p>
      ) : hint ? (
        <p className='mt-1.5 text-[12.5px] text-[var(--muted)]'>{hint}</p>
      ) : null}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold transition',
        active ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--border)]',
      )}
    >
      {children}
    </button>
  )
}
