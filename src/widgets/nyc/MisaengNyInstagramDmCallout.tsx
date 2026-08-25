import {
  MISAENG_NY_INSTAGRAM_HANDLE,
  MISAENG_NY_INSTAGRAM_URL,
} from '@lib/constants/nyc'

type MisaengNyInstagramDmCalloutProps = {
  message: string
}

export function MisaengNyInstagramDmCallout({
  message,
}: MisaengNyInstagramDmCalloutProps) {
  return (
    <div className='mt-8 rounded-[1.25rem] bg-white px-6 py-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
      <p className='text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {message}{' '}
        <span className='font-medium text-[var(--foreground)]'>
          @{MISAENG_NY_INSTAGRAM_HANDLE}
        </span>
        로 DM 보내주세요.
      </p>
      <a
        href={MISAENG_NY_INSTAGRAM_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
      >
        인스타그램 DM 보내기
      </a>
    </div>
  )
}
