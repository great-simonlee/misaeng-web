import { cn } from '@lib'

/** 회사 로고. 없으면 회사명 첫 글자 */
export function CompanyLogo({
  name,
  logoUrl,
  className,
}: {
  name: string
  logoUrl: string | null
  className?: string
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase 공개 URL, 크기가 작고 이미 256px
      <img
        src={logoUrl}
        alt=''
        loading='lazy'
        className={cn('shrink-0 rounded-xl bg-white object-contain ring-1 ring-black/[0.06]', className)}
      />
    )
  }
  const initial = Array.from(name.trim())[0]?.toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-[#f4f5f7] font-bold text-[var(--muted)] ring-1 ring-black/[0.04]',
        className,
      )}
    >
      {initial}
    </span>
  )
}
