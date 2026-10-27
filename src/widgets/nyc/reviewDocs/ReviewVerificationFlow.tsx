'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { BottomSheet, LoadingSpinner } from '@components'
import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { useT } from '@lib/i18n/client'
import {
  REVIEW_DOC_MAX_BYTES,
  REVIEW_DOC_MAX_FILES,
  type ReviewDocKind,
} from '@lib/verification/reviewDocs'
import {
  loadImageFile,
  renderMaskedJpeg,
  submitReviewDocs,
  type LoadedImage,
  type MaskBox,
} from '@lib/verification/reviewDocs.client'

import { MaskingEditor } from './MaskingEditor'

type Step = 'notice' | 'kind' | 'files' | 'mask' | 'uploading' | 'done'

type PickedItem =
  | { id: string; type: 'image'; image: LoadedImage; boxes: MaskBox[]; masked: boolean; thumb: string }
  | { id: string; type: 'pdf'; file: File; name: string; confirmed: boolean }

function release(list: PickedItem[]) {
  for (const item of list) {
    if (item.type === 'image') {
      item.image.close()
      if (item.thumb) URL.revokeObjectURL(item.thumb)
    }
  }
}

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif'

/**
 * Upload flow for review verification documents (spec 5.2): notice + required checkbox → kind → pick images →
 * mask every image (black boxes, flattened in the browser) → upload → "received" screen with the deletion promise.
 * Mount it only while open: closing unmounts it, which releases every decoded image and resets the flow.
 */
export function ReviewVerificationFlow({
  postId,
  kinds,
  onClose,
  onSubmitted,
}: {
  postId: string
  kinds: ReviewDocKind[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const t = useT('me.reviewDocs')
  const { error: toastError } = useToast()
  const [step, setStep] = useState<Step>('notice')
  const [agreed, setAgreed] = useState(false)
  const [kind, setKind] = useState<ReviewDocKind | null>(kinds.length === 1 ? kinds[0] : null)
  const [items, setItems] = useState<PickedItem[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)

  // Nothing picked survives the sheet: decoded images and previews are released on unmount.
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => () => release(itemsRef.current), [])

  async function onPick(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (files.length === 0) return
    if (items.length + files.length > REVIEW_DOC_MAX_FILES) {
      toastError(t('pick.tooMany', { max: REVIEW_DOC_MAX_FILES }))
      return
    }
    const next: PickedItem[] = []
    for (const file of files) {
      if (file.size > REVIEW_DOC_MAX_BYTES) {
        toastError(t('pick.tooLarge'))
        continue
      }
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf) {
        next.push({ id: crypto.randomUUID(), type: 'pdf', file, name: file.name, confirmed: false })
        continue
      }
      if (!/^image\//.test(file.type) && !/\.(jpe?g|png|heic|heif)$/i.test(file.name)) {
        toastError(t('pick.unsupported'))
        continue
      }
      try {
        const image = await loadImageFile(file)
        next.push({ id: crypto.randomUUID(), type: 'image', image, boxes: [], masked: false, thumb: '' })
      } catch {
        toastError(t('pick.readFailed'))
      }
    }
    if (next.length === 0) return
    setItems((prev) => [...prev, ...next])
    // Masking opens right away for the first new image.
    const firstImage = next.find((item) => item.type === 'image')
    if (firstImage) {
      setEditing(firstImage.id)
      setStep('mask')
    }
  }

  async function onMaskDone(id: string, boxes: MaskBox[]) {
    const item = items.find((i) => i.id === id)
    if (!item || item.type !== 'image') return
    let thumb = ''
    try {
      thumb = URL.createObjectURL(await renderMaskedJpeg(item.image, boxes))
    } catch {
      toastError(t('pick.readFailed'))
    }
    if (item.thumb) URL.revokeObjectURL(item.thumb)
    setItems((prev) => prev.map((i) => (i.id === id && i.type === 'image' ? { ...i, boxes, masked: true, thumb } : i)))
    // Next image still waiting for a mask, else back to the list.
    const pending = items.find((i) => i.type === 'image' && i.id !== id && !i.masked)
    if (pending) setEditing(pending.id)
    else {
      setEditing(null)
      setStep('files')
    }
  }

  function remove(id: string) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id)
      if (found) release([found])
      return prev.filter((i) => i.id !== id)
    })
  }

  const ready =
    Boolean(kind) &&
    items.length > 0 &&
    items.every((i) => (i.type === 'image' ? i.masked : i.confirmed))

  async function upload() {
    if (!kind || !ready) return
    setBusy(true)
    setStep('uploading')
    try {
      const files: { blob: Blob; name: string }[] = []
      let n = 1
      for (const item of items) {
        if (item.type === 'image') files.push({ blob: await renderMaskedJpeg(item.image, item.boxes), name: `document-${n}.jpg` })
        else files.push({ blob: item.file, name: `document-${n}.pdf` })
        n += 1
      }
      await submitReviewDocs({ postId, kind, files }, t('uploadFailed'))
      release(items)
      setItems([])
      setStep('done')
      onSubmitted()
    } catch (err) {
      toastError(err instanceof Error && err.message ? err.message : t('uploadFailed'))
      setStep('files')
    } finally {
      setBusy(false)
    }
  }

  const editingItem = items.find((i) => i.id === editing && i.type === 'image') as
    | Extract<PickedItem, { type: 'image' }>
    | undefined
  const kindMask = kind ? t('maskLabel', { items: t(`kinds.${kind}.mask`) }) : undefined

  const title =
    step === 'done' ? t('done.title') : step === 'mask' ? t('mask.title') : step === 'notice' ? t('notice.title') : t('entry.title')

  return (
    <BottomSheet
      open
      onClose={() => {
        if (busy) return
        onClose()
      }}
      title={title}
      maxHeightClassName='max-h-[min(86dvh,820px)]'
    >
      <div className='pb-2'>
        {step === 'notice' ? (
          <div className='space-y-4'>
            <p className='rounded-2xl bg-[var(--surface)] px-4 py-3.5 text-[14px] leading-relaxed text-[var(--foreground)] ring-1 ring-black/[0.05]'>
              {t('notice.body')}
            </p>
            <ul className='space-y-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
              <li className='flex gap-2.5'>
                <span aria-hidden className='mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' />
                <span>{t('notice.screenshotTip')}</span>
              </li>
              <li className='flex gap-2.5'>
                <span aria-hidden className='mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--brand)]' />
                <span>{t('notice.maskTip')}</span>
              </li>
            </ul>
            <label className='flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/10'>
              <input
                type='checkbox'
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className='mt-0.5 size-5 shrink-0 accent-[var(--brand)]'
              />
              <span className='text-[14px] font-semibold leading-snug text-[var(--foreground)]'>{t('notice.agree')}</span>
            </label>
            <PrimaryButton disabled={!agreed} onClick={() => setStep('kind')}>
              {t('notice.continue')}
            </PrimaryButton>
          </div>
        ) : null}

        {step === 'kind' ? (
          <div className='space-y-3'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>{t('kindTitle')}</p>
            <div className='space-y-2'>
              {kinds.map((k) => (
                <button
                  key={k}
                  type='button'
                  onClick={() => setKind(k)}
                  className={cn(
                    'w-full rounded-2xl px-4 py-3.5 text-left ring-1 transition',
                    kind === k ? 'bg-[var(--brand-soft)] ring-[var(--brand)]' : 'bg-white ring-black/10',
                  )}
                >
                  <p className='text-[15px] font-semibold text-[var(--foreground)]'>{t(`kinds.${k}.label`)}</p>
                  <p className='mt-0.5 text-[12.5px] text-[var(--muted-foreground)]'>{t(`kinds.${k}.example`)}</p>
                  <p className='mt-1 text-[12px] font-medium text-amber-800'>
                    {t('maskLabel', { items: t(`kinds.${k}.mask`) })}
                  </p>
                </button>
              ))}
            </div>
            <div className='flex gap-2 pt-1'>
              <SecondaryButton onClick={() => setStep('notice')}>{t('back')}</SecondaryButton>
              <PrimaryButton disabled={!kind} onClick={() => setStep('files')}>
                {t('next')}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {step === 'files' ? (
          <div className='space-y-3'>
            <p className='text-[13px] text-[var(--muted)]'>{t('pick.hint', { max: REVIEW_DOC_MAX_FILES })}</p>
            {kindMask ? (
              <p className='rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-900'>{kindMask}</p>
            ) : null}
            <div className='space-y-2'>
              {items.map((item) =>
                item.type === 'image' ? (
                  <div key={item.id} className='flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-black/10'>
                    <div className='size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--surface)]'>
                      {item.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview of the masked render
                        <img src={item.thumb} alt='' className='size-full object-cover' draggable={false} />
                      ) : null}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-[13px] font-semibold text-[var(--foreground)]'>
                        {item.masked ? t('pick.masked', { count: item.boxes.length }) : t('pick.notMasked')}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        setEditing(item.id)
                        setStep('mask')
                      }}
                      className='rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--foreground)]'
                    >
                      {t('pick.edit')}
                    </button>
                    <button
                      type='button'
                      onClick={() => remove(item.id)}
                      className='rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-red-600'
                    >
                      {t('pick.remove')}
                    </button>
                  </div>
                ) : (
                  <div key={item.id} className='space-y-2 rounded-2xl bg-white p-3 ring-1 ring-black/10'>
                    <div className='flex items-center gap-3'>
                      <span className='flex size-10 items-center justify-center rounded-xl bg-red-50 text-[11px] font-bold text-red-600'>
                        PDF
                      </span>
                      <p className='min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--foreground)]'>{item.name}</p>
                      <button
                        type='button'
                        onClick={() => remove(item.id)}
                        className='rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-red-600'
                      >
                        {t('pick.remove')}
                      </button>
                    </div>
                    <p className='text-[12.5px] font-semibold text-[var(--foreground)]'>{t('pick.pdfTitle')}</p>
                    <p className='text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('pick.pdfBody')}</p>
                    <label className='flex cursor-pointer items-start gap-2.5'>
                      <input
                        type='checkbox'
                        checked={item.confirmed}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((i) => (i.id === item.id && i.type === 'pdf' ? { ...i, confirmed: e.target.checked } : i)),
                          )
                        }
                        className='mt-0.5 size-4 shrink-0 accent-[var(--brand)]'
                      />
                      <span className='text-[12.5px] font-semibold text-[var(--foreground)]'>{t('pick.pdfConfirm')}</span>
                    </label>
                  </div>
                ),
              )}
            </div>
            {items.length < REVIEW_DOC_MAX_FILES ? (
              <button
                type='button'
                onClick={() => inputRef.current?.click()}
                className='flex h-12 w-full items-center justify-center rounded-2xl border-2 border-dashed border-black/15 text-[14px] font-semibold text-[var(--foreground)]'
              >
                + {t('pick.add')}
              </button>
            ) : null}
            <input
              ref={inputRef}
              type='file'
              accept={ACCEPT}
              multiple
              className='hidden'
              onChange={(e) => void onPick(e.target.files)}
            />
            <div className='flex gap-2 pt-1'>
              <SecondaryButton onClick={() => setStep('kind')}>{t('back')}</SecondaryButton>
              <PrimaryButton disabled={!ready} onClick={() => void upload()}>
                {t('submit')}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        {step === 'mask' && editingItem ? (
          <MaskingEditor
            key={editingItem.id}
            image={editingItem.image}
            initialBoxes={editingItem.boxes}
            maskHint={kindMask}
            onCancel={() => {
              // An image that was never masked is not kept.
              if (!editingItem.masked) remove(editingItem.id)
              setEditing(null)
              setStep('files')
            }}
            onDone={(boxes) => void onMaskDone(editingItem.id, boxes)}
          />
        ) : null}

        {step === 'uploading' ? (
          <div className='flex flex-col items-center gap-3 py-10'>
            <LoadingSpinner size='md' />
            <p className='text-[14px] font-medium text-[var(--muted)]'>{t('uploading')}</p>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className='space-y-4 py-2 text-center'>
            <div className='mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600'>
              ✓
            </div>
            <p className='text-[15px] font-semibold leading-relaxed text-[var(--foreground)]'>{t('done.body')}</p>
            <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{t('done.detail')}</p>
            <PrimaryButton onClick={onClose}>{t('done.close')}</PrimaryButton>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  )
}

function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className='h-12 flex-[2] w-full rounded-full bg-[var(--brand)] text-[15px] font-semibold text-white transition disabled:bg-black/10 disabled:text-[var(--muted)]'
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='h-12 flex-1 rounded-full bg-white text-[15px] font-semibold text-[var(--foreground)] ring-1 ring-black/10'
    >
      {children}
    </button>
  )
}
