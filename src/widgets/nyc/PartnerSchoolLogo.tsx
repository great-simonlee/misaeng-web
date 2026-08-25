import Image from 'next/image'

import { cn } from '@lib'

type PartnerSchoolLogoProps = {
  shortName: string
  logoSrc?: string | null
  className?: string
  size?: 'sm' | 'md'
}

export function PartnerSchoolLogo({
  shortName,
  logoSrc,
  className,
  size = 'sm',
}: PartnerSchoolLogoProps) {
  const dimension = size === 'md' ? 'size-10' : 'size-8'

  if (logoSrc) {
    return (
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/[0.06]',
          dimension,
          className,
        )}
      >
        <Image
          src={logoSrc}
          alt=''
          fill
          className='object-contain p-1'
          sizes={size === 'md' ? '40px' : '32px'}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[10px] font-bold tracking-tight text-[var(--foreground)]',
        dimension,
        className,
      )}
      aria-hidden
    >
      {shortName}
    </span>
  )
}
