import Image from 'next/image'

import { cn } from '@lib'

/** Ellieo's square brand mark: the app icon as a rounded tile (~22% radius). The banner logo stays in the top bar/footer. */
export function EllieoAppIcon({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Image
      src='/img/ellieo_app_icon.png'
      alt=''
      width={size}
      height={size}
      className={cn('shrink-0 object-cover', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
    />
  )
}
