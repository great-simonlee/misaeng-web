import Link from 'next/link'

import { NYC_PAGE_SHELL_CLASS } from '@lib/constants/nyc'
import { cn } from '@lib'

/** RealPage E-Sign document set for Soo Jin Hwang */
const SOOJIN_ESIGN_URL =
  'https://eaas.realpage.com/v1/document_sets/073f45ef-b419-402b-a728-afae9bb17155.html?access_token=eyJhbGciOiJSUzI1NiIsImtpZCI6IkM5NDg3REIyNDJEMjEwQjRFOEM5MDk0Nzc2NUIzN0UzIiwieDV0IjoiWldVVW9hUVlTTlktc09HaEc5eDZ4X3FFWk4wIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2lkLnJlYWxwYWdlLmNvbSIsIm5iZiI6MTc4ODk3NTI5OSwiaWF0IjoxNzg4OTc1Mjk5LCJleHAiOjE3ODg5NzY0OTksImF1ZCI6WyJlYWFzLWNsaWVudCIsImh0dHBzOi8vaWQucmVhbHBhZ2UuY29tL3Jlc291cmNlcyJdLCJzY29wZSI6WyJlYWFzLWNsaWVudCJdLCJjbGllbnRfaWQiOiJlYWFzLTIwLW1pbiIsImp0aSI6IjJDMzg1QTAxM0Y3QUVBODQ5NTEyQzMzODlEMEFERDAwIn0.1_v1APGCPPPiPeSd6kv0_70Xbu4K2HAJuhxs-eZbocXHME_IwMmfeSyRhB2hnFI75noA-7fmJp3gy40GhLrqh27gdIzYonajjqTDdDLDNCfw9QbTTz595OXeZj5ocAV7AYROsqGdez26FxEcRFRlTbpPVZjRVv5SIdEMvzvLG8VKu3Ouk_VV4Wi6xgLwztUzuYrYa3GrAEmwp8KhoJ7hfevCqxxThEx5IvPutPAFuX0inQgOxzyY-FiheKYd0Lbrssr-vngU7XIAWuVFezYyfZzTtzJ7Gme-xjv3d2LpuOSBf6j8_QkGI1MLP9uunNUQYk2_ygxyNeuekPcC3YYMNA'

export function SoojinScreen() {
  return (
    <div className='min-h-[60vh] bg-[linear-gradient(180deg,#f6f7f9_0%,#ffffff_42%,#ffffff_100%)]'>
      <div
        className={cn(
          NYC_PAGE_SHELL_CLASS,
          'flex max-w-lg flex-col items-center py-16 text-center sm:py-24',
        )}
      >
        <p className='text-[11px] font-medium tracking-[0.22em] text-[var(--muted)]'>
          MISAENG NYC
        </p>
        <h1 className='mt-3 text-[1.5rem] font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-[1.75rem]'>
          Soo Jin Hwang
        </h1>
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          Open the lease e-sign documents below.
        </p>

        <a
          href={SOOJIN_ESIGN_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-8 inline-flex min-h-[48px] w-full max-w-sm items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff4c14_0%,#f64310_50%,#df390e_100%)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(246,67,16,0.24)] touch-manipulation transition hover:brightness-[1.03]'
        >
          Open E-Sign Documents
        </a>

        <Link
          href='/nyc'
          className='mt-6 text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-[var(--foreground)]'
        >
          ← Back to NYC
        </Link>
      </div>
    </div>
  )
}
