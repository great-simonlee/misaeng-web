'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { BottomSheet, LoadingSpinner } from '@components'
import { useCityPath } from '@hooks/useCity'
import { useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { useLocale, useT } from '@lib/i18n/client'
import type { ReviewDocStatus, ReviewDocSubmission } from '@lib/verification/reviewDocs'
import { deleteReviewDoc, fetchReviewDocs } from '@lib/verification/reviewDocs.client'

const STATUS_TONE: Record<ReviewDocStatus, string> = {
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-600',
  withdrawn: 'bg-slate-100 text-slate-600',
}

/** My page → "후기 인증 내역": status, deletion due / done, and "지금 삭제" while files remain (spec 5.5). */
export function MyPageReviewVerifications() {
  const t = useT('me.reviewDocs')
  const locale = useLocale()
  const href = useCityPath()
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<ReviewDocSubmission[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setItems((await fetchReviewDocs()).submissions)
      setNow(Date.now())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const formatWhen = useCallback(
    (iso: string | null) => {
      if (!iso) return ''
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
      } catch {
        return iso
      }
    },
    [locale],
  )

  async function confirmDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await deleteReviewDoc(confirmId, t('history.deleteFailed'))
      success(t('history.deletedToast'))
    } catch (err) {
      toastError(err instanceof Error && err.message ? err.message : t('history.deleteFailed'))
    } finally {
      setDeleting(false)
      setConfirmId(null)
      void load()
    }
  }

  return (
    <section id='review-verifications' className='scroll-mt-24'>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('history.title')}
      </h3>
      <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        {loading && !items ? (
          <div className='flex justify-center py-8'>
            <LoadingSpinner size='sm' />
          </div>
        ) : failed && !items ? (
          <div className='flex flex-col items-center gap-2 px-5 py-6'>
            <p className='text-[13px] text-[var(--muted)]'>{t('history.loadFailed')}</p>
            <button type='button' onClick={() => void load()} className='text-[13px] font-semibold text-[var(--brand)]'>
              {t('history.retry')}
            </button>
          </div>
        ) : !items?.length ? (
          <p className='px-5 py-5 text-[13px] leading-relaxed text-[var(--muted)]'>{t('history.empty')}</p>
        ) : (
          <ul className='divide-y divide-black/[0.05]'>
            {items.map((item) => (
              <li key={item.id} className='px-5 py-4'>
                <div className='flex items-center gap-2'>
                  <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[item.status])}>
                    {t(`status.${item.status}`)}
                  </span>
                  <span className='text-[14px] font-semibold text-[var(--foreground)]'>{t(`kinds.${item.kind}.label`)}</span>
                  <span className='text-[12px] text-[var(--muted)]'>{t('history.files', { count: item.fileCount })}</span>
                </div>
                {item.resultLabel ? (
                  <p className='mt-1.5 text-[13px] text-[var(--foreground)]'>{t('history.result', { label: item.resultLabel })}</p>
                ) : null}
                {item.status === 'rejected' && item.rejectReason ? (
                  <p className='mt-1.5 text-[13px] text-red-700'>
                    {t('history.reason', { reason: t(`rejectReasons.${item.rejectReason}`) })}
                  </p>
                ) : null}
                <dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]'>
                  <dt className='text-[var(--muted)]'>{t('history.uploaded')}</dt>
                  <dd className='text-[var(--foreground)]'>{formatWhen(item.uploadedAt)}</dd>
                  {item.decidedAt ? (
                    <>
                      <dt className='text-[var(--muted)]'>{t('history.decided')}</dt>
                      <dd className='text-[var(--foreground)]'>{formatWhen(item.decidedAt)}</dd>
                    </>
                  ) : null}
                  {item.deletedAt ? (
                    <>
                      <dt className='text-[var(--muted)]'>{t('history.deleted')}</dt>
                      <dd className='font-semibold text-emerald-700'>{formatWhen(item.deletedAt)}</dd>
                    </>
                  ) : (
                    <>
                      <dt className='text-[var(--muted)]'>{t('history.deleteDue')}</dt>
                      <dd className='text-[var(--foreground)]'>
                        {new Date(item.deleteDueAt).getTime() <= now ? t('history.deleting') : formatWhen(item.deleteDueAt)}
                      </dd>
                    </>
                  )}
                </dl>
                <div className='mt-3 flex items-center gap-3'>
                  {item.filesRemaining > 0 ? (
                    <button
                      type='button'
                      onClick={() => setConfirmId(item.id)}
                      className='rounded-full bg-red-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-red-700'
                    >
                      {t('history.deleteNow')}
                    </button>
                  ) : null}
                  {item.postId && item.board ? (
                    <Link href={href(`/${item.board}/${item.postId}`)} className='text-[12.5px] font-semibold text-[var(--muted-foreground)]'>
                      {t('history.viewPost')}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className='border-t border-black/[0.05] bg-[var(--surface)] px-5 py-3 text-[12px] leading-relaxed text-[var(--muted)]'>
          {t('history.note')}
        </p>
      </div>

      <BottomSheet
        open={Boolean(confirmId)}
        onClose={() => {
          if (!deleting) setConfirmId(null)
        }}
        title={t('history.deleteConfirmTitle')}
        footer={
          <div className='flex gap-2'>
            <button
              type='button'
              disabled={deleting}
              onClick={() => setConfirmId(null)}
              className='h-12 flex-1 rounded-full bg-white text-[15px] font-semibold text-[var(--foreground)] ring-1 ring-black/10'
            >
              {t('cancel')}
            </button>
            <button
              type='button'
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className='flex h-12 flex-[2] items-center justify-center rounded-full bg-red-600 text-[15px] font-semibold text-white disabled:opacity-70'
            >
              {deleting ? <LoadingSpinner size='sm' /> : t('history.deleteConfirm')}
            </button>
          </div>
        }
      >
        <p className='text-[14px] leading-relaxed text-[var(--muted-foreground)]'>{t('history.deleteConfirmBody')}</p>
      </BottomSheet>
    </section>
  )
}
