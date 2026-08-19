'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  NYC_COMMUNITY_BOARD_META,
  isAnonymousBoard,
  type NycCommunityBoardId,
} from '@lib/constants/nyc'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { createCommunityPost } from '@lib/firebase/community'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { LoadingState } from '@components'

interface CommunityNewScreenProps {
  boardId: NycCommunityBoardId
  title: string
}

export function CommunityNewScreen({
  boardId,
  title,
}: CommunityNewScreenProps) {
  const meta = NYC_COMMUNITY_BOARD_META[boardId]
  const { user, loading, configured, profile } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [postTitle, setPostTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [detail, setDetail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return
    setSubmitting(true)
    try {
      // 임시: 파이어베이스 커뮤니티 등록 비활성화
      throw new Error('Firebase가 일시적으로 비활성화되어 있어요')
      /*
      const id = await createCommunityPost(
        {
          categoryId: boardId,
          title: postTitle.trim(),
          description: description.trim(),
          location: location.trim(),
          detail: detail.trim(),
        },
        user.uid,
        user.email,
        isAnonymousBoard(boardId)
          ? { id: null, name: null }
          : {
              id: profile?.verifiedSchoolId ?? null,
              name: profile?.verifiedSchoolName ?? null,
            },
      )
      success('글을 등록했어요')
      router.push(`/nyc/${boardId}/${id}`)
      */
    } catch (err) {
      toastError(getErrorMessage(err, '등록에 실패했어요'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState fullPage />
  }

  // 임시: 파이어베이스 배너 비활성화
  /*
  if (!configured || !isFirebaseConfigured()) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <FirebaseConfigBanner />
      </div>
    )
  }
  */

  if (!user) {
    return (
      <div className='mx-auto max-w-2xl px-4 py-12'>
        <h1 className='text-2xl font-bold'>로그인이 필요합니다</h1>
        <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
          로그인 후 {title} 글을 올릴 수 있습니다.
        </p>
        <Link
          href={`/nyc/login?next=${encodeURIComponent(`/nyc/${boardId}/new`)}`}
          className='mt-6 inline-flex rounded-full bg-[#F64310] px-5 py-2.5 text-sm font-semibold text-white'
        >
          로그인
        </Link>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[var(--background)]'>
      <div className='mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12'>
        <p className='text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]'>
          <Link href={`/nyc/${boardId}`} className='hover:text-[#F64310]'>
            {title}
          </Link>{' '}
          / 등록
        </p>
        <h1 className='mt-3 text-2xl font-bold tracking-tight sm:text-3xl'>
          {meta.writeLabel}
        </h1>
        <p className='mt-2 text-sm text-[var(--muted-foreground)]'>
          {user.email}
        </p>

        <form
          onSubmit={handleSubmit}
          className='mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6'
        >
          <Field label='제목' required>
            <input
              required
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className={inputClass}
              placeholder={meta.titlePlaceholder}
            />
          </Field>
          <Field label={meta.locationLabel}>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder={meta.locationPlaceholder}
            />
          </Field>
          {meta.detailInput && meta.detailLabel && (
            <Field label={meta.detailLabel}>
              <input
                type={meta.detailInput === 'number' ? 'number' : meta.detailInput}
                min={meta.detailInput === 'number' ? 0 : undefined}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className={inputClass}
                placeholder={meta.detailPlaceholder}
              />
            </Field>
          )}
          <Field label='상세 설명' required>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder={meta.descriptionPlaceholder}
            />
          </Field>

          <button
            type='submit'
            disabled={submitting}
            className='min-h-[48px] w-full rounded-full bg-[#F64310] text-sm font-semibold text-white touch-manipulation hover:bg-[#d93a0e] disabled:opacity-50'
          >
            {submitting ? '등록 중…' : '게시하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'mt-1.5 min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[#F64310]'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className='block text-sm font-medium text-[var(--foreground)]'>
      {label}
      {required ? ' *' : ''}
      {children}
    </label>
  )
}
