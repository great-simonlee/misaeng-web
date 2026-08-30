import {
  ANONYMOUS_WRITING_GUIDELINES,
  COMMUNITY_WRITING_GUIDELINES,
} from '@lib/constants/communityGuidelines'
import { cn } from '@lib'

type CommunityWritingGuidelinesProps = {
  /** 익명게시판: 공통 + 익명 전용 안내를 강조 표시 */
  anonymous?: boolean
  className?: string
}

/** 글쓰기 화면용 커뮤니티 이용 안내 */
export function CommunityWritingGuidelines({
  anonymous = false,
  className,
}: CommunityWritingGuidelinesProps) {
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3.5 text-[13px] leading-relaxed ring-1',
        anonymous
          ? 'bg-[#fff8f5] text-[var(--muted-foreground)] ring-[var(--brand)]/18'
          : 'bg-[#f4f5f7] text-[var(--muted-foreground)] ring-black/[0.06]',
        className,
      )}
    >
      <p
        className={cn(
          'text-[12px] font-semibold',
          anonymous ? 'text-[var(--brand)]' : 'text-[var(--foreground)]',
        )}
      >
        {anonymous ? '익명게시판 작성 안내' : '커뮤니티 작성 안내'}
      </p>
      <ul className='mt-2 space-y-1.5'>
        {COMMUNITY_WRITING_GUIDELINES.map((item) => (
          <li key={item} className='flex gap-2'>
            <span
              className={cn(
                'mt-1.5 size-1 shrink-0 rounded-full',
                anonymous ? 'bg-[var(--brand)]/70' : 'bg-[var(--muted)]',
              )}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
        {anonymous
          ? ANONYMOUS_WRITING_GUIDELINES.map((item) => (
              <li key={item} className='flex gap-2'>
                <span
                  className='mt-1.5 size-1 shrink-0 rounded-full bg-[var(--brand)]/70'
                  aria-hidden
                />
                <span className='font-medium text-[var(--foreground)]/85'>
                  {item}
                </span>
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}
