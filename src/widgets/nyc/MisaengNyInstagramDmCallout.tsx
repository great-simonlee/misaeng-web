'use client'

import {
  MISAENG_NY_INSTAGRAM_HANDLE,
  MISAENG_NY_INSTAGRAM_URL,
} from '@lib/constants/nyc'
import { useT } from '@lib/i18n/client'

/** 문구 안 {handle} 자리에 굵은 핸들을 넣기 위한 표시 */
const HANDLE_MARK = '\u0000'

type MisaengNyInstagramDmCalloutProps = {
  /** 문의 주제 (예: 파트너 학생회 문의는 인스타그램). hub.instagramDm.body의 {message} */
  message: string
}

export function MisaengNyInstagramDmCallout({
  message,
}: MisaengNyInstagramDmCalloutProps) {
  const t = useT('hub')
  const [before, after = ''] = t('instagramDm.body', {
    message,
    handle: HANDLE_MARK,
  }).split(HANDLE_MARK)
  return (
    <div className='mt-8 rounded-[1.25rem] bg-white px-6 py-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
      <p className='text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
        {before}
        <span className='font-medium text-[var(--foreground)]'>
          @{MISAENG_NY_INSTAGRAM_HANDLE}
        </span>
        {after}
      </p>
      <a
        href={MISAENG_NY_INSTAGRAM_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-5 inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-[13px] font-semibold text-white touch-manipulation transition hover:bg-[var(--navy-light)]'
      >
        {t('instagramDm.button')}
      </a>
    </div>
  )
}
