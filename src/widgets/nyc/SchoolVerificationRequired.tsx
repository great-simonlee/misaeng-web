'use client'

import Link from 'next/link'

import { cn } from '@lib'
import { useAuth } from '@hooks/useAuth'
import { useCityPath } from '@hooks/useCity'
import { byBrand } from '@lib/brand/design'
import {
  getIdentityVerifyHref,
  isParentAccount,
  PARENT_WRITE_BOARD,
} from '@lib/community/schoolGate'
import { useT } from '@lib/i18n/client'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

type SchoolVerificationRequiredProps = {
  /** 인증 후 돌아갈 경로 (예: /boston/food/new) */
  nextPath?: string
  /** 글쓰기 게시판 — 학부모 계정이 질문·자유 밖에서 쓰려 할 때 안내가 달라진다 */
  boardId?: string
  /** false면 BoardPageShell 없이 본문만 */
  withShell?: boolean
}

/**
 * 글쓰기 게이트 (1.0.7). 인증 전: 학교 이메일(바로 공개) · 회사 이메일 · 재직·전 직장 서류(승인 후 공개) 세 가지 중 고른다.
 * 학교가 가장 빠르다는 걸 보이게 맨 위·강조. 학부모 계정은 질문·자유로 안내한다.
 */
export function SchoolVerificationRequired({
  nextPath,
  boardId,
  withShell = true,
}: SchoolVerificationRequiredProps) {
  const cityHref = useCityPath()
  const t = useT()
  const { profile } = useAuth()

  if (isParentAccount(profile) && boardId !== PARENT_WRITE_BOARD) {
    const body = <ParentBoardNotice />
    return withShell ? <BoardPageShell width='narrow'>{body}</BoardPageShell> : body
  }

  const choices = [
    {
      kind: 'school' as const,
      title: t('community.verifyChoice.school.title'),
      hint: t('community.verifyChoice.school.hint'),
      badge: t('community.verifyChoice.fastest'),
    },
    {
      kind: 'workplace' as const,
      title: t('community.verifyChoice.workEmail.title'),
      hint: t('community.verifyChoice.workEmail.hint'),
      badge: null,
    },
    {
      kind: 'workplaceDocs' as const,
      title: t('community.verifyChoice.documents.title'),
      hint: t('community.verifyChoice.documents.hint'),
      badge: null,
    },
  ]

  const body = (
    <div className='mx-auto max-w-md px-4 py-14 text-center sm:py-16'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]'>
        Verification
      </p>
      <h1 className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.5rem]'>
        {t('me.verificationRequired.title')}
      </h1>
      <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {t('community.verifyChoice.description')}
      </p>
      <ul className='mt-7 space-y-2.5 text-left'>
        {choices.map((choice, index) => (
          <li key={choice.kind}>
            <Link
              href={getIdentityVerifyHref(nextPath, choice.kind)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3.5 touch-manipulation transition',
                index === 0
                  ? byBrand(
                      'bg-[var(--brand)] text-white shadow-[0_4px_14px_rgb(var(--brand-rgb)/0.28)] hover:bg-[var(--brand-hover)]',
                      'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]',
                    )
                  : 'bg-white text-[var(--foreground)] ring-1 ring-black/[0.06] hover:bg-[#f8f9fb]',
              )}
            >
              <span className='min-w-0 flex-1'>
                <span className='flex flex-wrap items-center gap-1.5'>
                  <span className='text-[15px] font-semibold tracking-tight'>{choice.title}</span>
                  {choice.badge ? (
                    <span className='rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold'>{choice.badge}</span>
                  ) : null}
                </span>
                <span className={cn('mt-0.5 block text-[12px]', index === 0 ? 'text-white/85' : 'text-[var(--muted)]')}>
                  {choice.hint}
                </span>
              </span>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='size-4 shrink-0 opacity-70' aria-hidden>
                <path strokeLinecap='round' strokeLinejoin='round' d='m9 6 6 6-6 6' />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
      <p className='mt-4 text-[12px] leading-relaxed text-[var(--muted)]'>{t('community.verifyChoice.heldNote')}</p>
      <p className='mt-6'>
        <Link
          href={cityHref()}
          className='text-[13px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline'
        >
          {t('me.verificationRequired.toCommunityHome')}
        </Link>
      </p>
    </div>
  )

  if (!withShell) return body
  return <BoardPageShell width='narrow'>{body}</BoardPageShell>
}

/** 학부모 계정이 질문·자유 밖에서 글쓰기를 눌렀을 때 */
export function ParentBoardNotice() {
  const cityHref = useCityPath()
  const t = useT()
  return (
    <div className='mx-auto max-w-md px-4 py-14 text-center sm:py-16'>
      <h1 className='text-[1.25rem] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('community.parent.writeOnlyAnonymous')}
      </h1>
      <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {t('community.parent.writeOnlyAnonymousHint')}
      </p>
      <Link
        href={cityHref(`/${PARENT_WRITE_BOARD}/new`)}
        className='mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand)] px-6 text-[14px] font-semibold text-white touch-manipulation transition hover:bg-[var(--brand-hover)]'
      >
        {t('community.parent.toAnonymousComposer')}
      </Link>
    </div>
  )
}
