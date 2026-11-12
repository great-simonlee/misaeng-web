'use client'

import { useT } from '@lib/i18n/client'

/** 글쓰기 화면의 "가이드라인" 버튼: 작성 가이드·커뮤니티 안내를 다시 연다 (앱 글쓰기 상단 버튼과 같음). */
export function WriteGuideButton({ onClick }: { onClick: () => void }) {
  const t = useT('reviews')
  return (
    <button
      type='button'
      onClick={onClick}
      className='mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f4f5f7] px-3 text-[12px] font-semibold text-[var(--foreground)] transition hover:bg-[#eceef1]'
    >
      <svg viewBox='0 0 24 24' className='size-3.5' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden>
        <path d='M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21h12' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
      {t('orientation.guideButton')}
    </button>
  )
}
