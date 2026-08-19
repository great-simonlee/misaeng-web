'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { LoadingState, BottomSheet, BottomSheetSelect } from '@components'
import { useAuth } from '@hooks/useAuth'
import {
  MAX_NICKNAME_LEN,
  MIN_NICKNAME_LEN,
} from '@lib/constants/profile'
import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { cn } from '@lib'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { MBTI_TYPES } from '@lib/constants/mbti'
// import { isFirebaseConfigured } from '@lib/firebase/client'
// import { FirebaseConfigBanner } from '@widgets/nyc/FirebaseConfigBanner'
import { ProfileVerificationSection } from '@widgets/nyc/ProfileVerificationSection'

export function MyPageScreen() {
  const {
    user,
    loading,
    logout,
    isMisaengUser,
    configured,
    avatarURL,
    displayName,
    nickname,
    profile,
    uploadAvatar,
    saveNickname,
    saveMbti,
  } = useAuth()
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const [savingMbti, setSavingMbti] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace(`/nyc/login?next=${encodeURIComponent('/nyc/me')}`)
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!editingNickname) {
      setNicknameDraft(nickname ?? '')
    }
  }, [nickname, editingNickname])

  async function handleLogout() {
    await logout()
    success('로그아웃했어요')
    router.push('/nyc')
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      await uploadAvatar(file)
      success('프로필 사진을 등록했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '사진 업로드에 실패했어요'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveNickname() {
    setSavingNickname(true)
    try {
      await saveNickname(nicknameDraft)
      setEditingNickname(false)
      success('닉네임을 저장했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '닉네임 저장에 실패했어요'))
    } finally {
      setSavingNickname(false)
    }
  }

  async function handleSelectMbti(next: string) {
    if ((profile?.mbti ?? '') === next) return
    setSavingMbti(true)
    try {
      await saveMbti(next || null)
      success(next ? 'MBTI를 저장했어요' : 'MBTI를 삭제했어요')
    } catch (err) {
      toastError(getErrorMessage(err, 'MBTI 저장에 실패했어요'))
    } finally {
      setSavingMbti(false)
    }
  }

  if (loading) {
    return <LoadingState fullPage />
  }

  if (!user) {
    return <LoadingState fullPage label='로그인 페이지로 이동 중…' />
  }

  // 임시: 파이어베이스 배너 비활성화
  /*
  if (!configured || !isFirebaseConfigured()) {
    return (
      <div className='mx-auto max-w-lg px-4 py-12'>
        <FirebaseConfigBanner />
      </div>
    )
  }
  */

  return (
    <div className='flex flex-1 flex-col bg-[linear-gradient(180deg,#f4f5f7_0%,#ffffff_55%,#ffffff_100%)]'>
      <div
        className={cn(
          'flex flex-1 flex-col pb-14 pt-8 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-12',
          NYC_PAGE_SHELL_CLASS,
        )}
      >
        <div className='mb-6 lg:mb-8'>
          <p className='text-[11px] font-medium tracking-[0.18em] text-[var(--muted)]'>
            ACCOUNT
          </p>
          <h1 className='mt-1.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] lg:text-[1.75rem]'>
            마이페이지
          </h1>
        </div>

        <div className='grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:items-start lg:gap-8'>
          <div className='flex flex-col gap-2 lg:sticky lg:top-24'>
            <aside className='overflow-hidden rounded-[1.5rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.04]'>
            <div className='relative h-20 bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_55%,#F64310_160%)] lg:h-24' />
            <div className='relative px-5 pb-6 pt-0 text-center sm:px-6'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className='group relative -mt-10 inline-flex touch-manipulation disabled:opacity-60 lg:-mt-12'
                aria-label='프로필 사진 변경'
              >
                <ProfileImage photoURL={avatarURL} displayName={displayName} />
                <span className='absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border-[3px] border-white bg-[var(--foreground)] text-white shadow-sm transition group-active:scale-95'>
                  {uploading ? (
                    <span className='size-3.5 animate-pulse rounded-full bg-white/70' />
                  ) : (
                    <CameraIcon />
                  )}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(e) => void handlePhotoChange(e.target.files?.[0])}
              />

              <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
                <h2 className='text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]'>
                  {displayName}
                </h2>
                {isMisaengUser && (
                  <span className='rounded-md bg-[var(--brand-muted)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand)]'>
                    TEAM
                  </span>
                )}
              </div>
              {profile?.verifiedSchoolName ? (
                <p className='mt-1.5 text-[13px] text-[var(--muted-foreground)]'>
                  {profile.verifiedSchoolName}
                </p>
              ) : (
                <p className='mt-1.5 text-[13px] text-[var(--muted)]'>
                  프로필을 완성해 보세요
                </p>
              )}

            </div>
          </aside>

            <LogoutSection
              onLogout={() => void handleLogout()}
              className='hidden lg:block'
            />
          </div>

          {/* 설정 영역 */}
          <div className='min-w-0 space-y-6 lg:space-y-7'>
            <section>
              <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
                프로필
              </h3>
              <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] lg:grid lg:grid-cols-2 lg:divide-x lg:divide-[#f0f1f3]'>
                <div className='px-5 py-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setNicknameDraft(nickname ?? '')
                      setEditingNickname(true)
                    }}
                    disabled={savingNickname}
                    className='flex w-full items-center gap-3 text-left touch-manipulation disabled:opacity-50'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='text-[12px] font-medium text-[var(--muted)]'>
                        닉네임
                      </p>
                      <p className='mt-1 truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                        {nickname ?? (
                          <span className='font-normal text-[var(--muted)]'>
                            아직 없어요
                          </span>
                        )}
                      </p>
                    </div>
                    <span className='shrink-0 text-[12px] font-medium text-[var(--muted)]'>
                      {nickname ? '수정' : '설정'}
                    </span>
                    <ChevronIcon />
                  </button>
                </div>

                <div className='border-t border-[#f0f1f3] lg:border-t-0'>
                  <div className='px-5 py-4'>
                    <BottomSheetSelect
                      title='MBTI 선택'
                      value={profile?.mbti ?? ''}
                      options={MBTI_TYPES.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                      emptyOption={{
                        value: '',
                        label: '선택 안 함',
                        description: '프로필에서 MBTI를 표시하지 않아요',
                      }}
                      onChange={(next) => void handleSelectMbti(next)}
                      disabled={savingMbti}
                    >
                      {({ open, displayLabel, selected }) => (
                        <button
                          type='button'
                          onClick={open}
                          disabled={savingMbti}
                          className='flex w-full items-center gap-3 text-left touch-manipulation disabled:opacity-50'
                        >
                          <div className='min-w-0 flex-1'>
                            <p className='text-[12px] font-medium text-[var(--muted)]'>
                              MBTI
                            </p>
                            <p className='mt-1 truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                              {selected ? (
                                <span className='tracking-[0.08em]'>
                                  {displayLabel}
                                </span>
                              ) : (
                                <span className='font-normal text-[var(--muted)]'>
                                  아직 없어요
                                </span>
                              )}
                            </p>
                          </div>
                          <span className='shrink-0 text-[12px] font-medium text-[var(--muted)]'>
                            {savingMbti
                              ? '저장 중…'
                              : selected
                                ? '수정'
                                : '설정'}
                          </span>
                          <ChevronIcon />
                        </button>
                      )}
                    </BottomSheetSelect>
                  </div>
                </div>
              </div>
            </section>

            <ProfileVerificationSection profile={profile} />
          </div>

          <LogoutSection
            onLogout={() => void handleLogout()}
            className='mt-2 sm:mt-4 lg:hidden'
          />
        </div>
      </div>

      <BottomSheet
        open={editingNickname}
        onClose={() => {
          if (savingNickname) return
          setEditingNickname(false)
          setNicknameDraft(nickname ?? '')
        }}
        title='닉네임 설정'
        maxHeightClassName='max-h-[min(50dvh,420px)]'
      >
        <div className='space-y-4 px-3 pb-2 pt-1'>
          <input
            type='text'
            value={nicknameDraft}
            maxLength={MAX_NICKNAME_LEN}
            onChange={(e) => setNicknameDraft(e.target.value)}
            placeholder={`${MIN_NICKNAME_LEN}~${MAX_NICKNAME_LEN}자`}
            className='h-11 w-full rounded-xl bg-[#f4f5f7] px-3.5 text-sm text-[var(--foreground)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30'
            autoFocus
          />
          <div className='flex items-center justify-between gap-2'>
            <span className='text-[11px] tabular-nums text-[var(--muted)]'>
              {nicknameDraft.trim().length}/{MAX_NICKNAME_LEN}
              <span className='ml-1.5'>· 최소 {MIN_NICKNAME_LEN}자</span>
            </span>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => {
                  setEditingNickname(false)
                  setNicknameDraft(nickname ?? '')
                }}
                disabled={savingNickname}
                className='h-9 rounded-full px-3.5 text-[13px] font-medium text-[var(--muted-foreground)] touch-manipulation'
              >
                취소
              </button>
              <button
                type='button'
                onClick={() => void handleSaveNickname()}
                disabled={
                  savingNickname ||
                  nicknameDraft.trim().length < MIN_NICKNAME_LEN
                }
                className='h-9 rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-40'
              >
                {savingNickname ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function ProfileImage({
  photoURL,
  displayName,
}: {
  photoURL: string | null
  displayName: string
}) {
  const [failed, setFailed] = useState(false)
  const show = Boolean(photoURL) && !failed

  useEffect(() => {
    setFailed(false)
  }, [photoURL])

  return (
    <span className='relative inline-flex size-[5.5rem] shrink-0 overflow-hidden rounded-full bg-[#e8eaee] ring-4 ring-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] lg:size-[6.25rem]'>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoURL!}
          alt={`${displayName} 프로필`}
          className='size-full object-cover'
          onError={() => setFailed(true)}
          referrerPolicy='no-referrer'
        />
      ) : (
        <span className='flex size-full items-center justify-center text-[#9aa3af]'>
          <svg
            viewBox='0 0 24 24'
            fill='currentColor'
            className='size-9'
            aria-hidden
          >
            <path d='M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z' />
          </svg>
        </span>
      )}
    </span>
  )
}

function CameraIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className='size-3.5'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4 8.5A1.5 1.5 0 0 1 5.5 7h2.1l1.2-1.6A1.5 1.5 0 0 1 10 4.5h4a1.5 1.5 0 0 1 1.2.9L16.4 7h2.1A1.5 1.5 0 0 1 20 8.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-8Z'
      />
      <circle cx='12' cy='12.5' r='3' />
    </svg>
  )
}

function LogoutSection({
  onLogout,
  className,
}: {
  onLogout: () => void
  className?: string
}) {
  return (
    <section className={cn(className)}>
      <button
        type='button'
        onClick={onLogout}
        className='group flex w-full items-center justify-between gap-3 rounded-[1.25rem] bg-white px-4 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04] transition hover:bg-[#fafafa] active:scale-[0.995] sm:px-5 sm:py-3.5'
      >
        <span className='flex min-w-0 items-center gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4f5f7] text-[#64748b] transition group-hover:bg-[#eef0f3] group-hover:text-[#334155] sm:size-9'>
            <LogoutIcon />
          </span>
          <span className='min-w-0'>
            <span className='block text-[15px] font-semibold tracking-tight text-[var(--foreground)]'>
              로그아웃
            </span>
            <span className='mt-0.5 block text-[13px] leading-snug text-[var(--muted-foreground)]'>
              이 기기에서 계정 연결을 해제해요
            </span>
          </span>
        </span>
        <ChevronIcon />
      </button>
    </section>
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className='size-[18px]'
      aria-hidden
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M10.5 12h10.25M18 9.75 21.25 12 18 14.25'
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      className='size-4 shrink-0 text-[#c4c9d1]'
      aria-hidden
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m9 6 6 6-6 6' />
    </svg>
  )
}
