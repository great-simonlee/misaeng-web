'use client'

import Link from 'next/link'

import { useCityPath } from '@hooks/useCity'
import {
  getIdentityVerifyCtaLabel,
  getIdentityVerifyHref,
  SCHOOL_VERIFY_REQUIRED_MESSAGE,
} from '@lib/community/schoolGate'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

type SchoolVerificationRequiredProps = {
  /** 인증 후 돌아갈 경로 (예: /boston/food/new) */
  nextPath?: string
  /** false면 BoardPageShell 없이 본문만 */
  withShell?: boolean
}

export function SchoolVerificationRequired({
  nextPath,
  withShell = true,
}: SchoolVerificationRequiredProps) {
  const cityHref = useCityPath()
  const href = getIdentityVerifyHref(nextPath)

  const body = (
    <div className='mx-auto max-w-md px-4 py-14 text-center sm:py-16'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]'>
        Verification
      </p>
      <h1 className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.5rem]'>
        인증이 필요해요
      </h1>
      <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {SCHOOL_VERIFY_REQUIRED_MESSAGE}
      </p>
      <Link
        href={href}
        className='mt-8 inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand)] px-6 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(246,67,16,0.28)] touch-manipulation transition hover:bg-[var(--brand-hover)]'
      >
        {getIdentityVerifyCtaLabel()}
      </Link>
      <p className='mt-4'>
        <Link
          href={cityHref()}
          className='text-[13px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline'
        >
          커뮤니티 홈으로
        </Link>
      </p>
    </div>
  )

  if (!withShell) return body
  return <BoardPageShell width='narrow'>{body}</BoardPageShell>
}
