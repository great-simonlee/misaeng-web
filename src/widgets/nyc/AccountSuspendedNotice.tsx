import Link from 'next/link'

import { ACCOUNT_SUSPENDED_MESSAGE } from '@lib/community/schoolGate'
import { BoardPageShell } from '@widgets/nyc/BoardPageShell'

type AccountSuspendedNoticeProps = {
  withShell?: boolean
}

export function AccountSuspendedNotice({
  withShell = true,
}: AccountSuspendedNoticeProps) {
  const body = (
    <div className='mx-auto max-w-md px-4 py-14 text-center sm:py-16'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]'>
        Account
      </p>
      <h1 className='mt-3 text-[1.35rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.5rem]'>
        계정이 이용 정지되었어요
      </h1>
      <p className='mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {ACCOUNT_SUSPENDED_MESSAGE}
      </p>
      <p className='mt-8'>
        <Link
          href='/nyc/me'
          className='text-[13px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline'
        >
          마이페이지로
        </Link>
      </p>
    </div>
  )

  if (!withShell) return body
  return <BoardPageShell width='narrow'>{body}</BoardPageShell>
}
