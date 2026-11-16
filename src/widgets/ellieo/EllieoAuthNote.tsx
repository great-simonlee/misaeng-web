'use client'

import { useT } from '@lib/i18n/client'
import { ShieldCheckIcon } from '@widgets/ellieo/icons'

/** Ellieo sign-in/sign-up: why we ask for a school or work email (brief §3) */
export function EllieoAuthNote() {
  const t = useT('auth')
  return (
    <div className='mt-3 flex gap-3 rounded-[1.25rem] bg-[var(--brand-soft)] px-4 py-3.5 text-[13.5px] leading-relaxed text-[var(--brand-deep)]'>
      <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white'>
        <ShieldCheckIcon className='size-[17px]' />
      </span>
      <p>{t('ellieo.verifyNote')}</p>
    </div>
  )
}
