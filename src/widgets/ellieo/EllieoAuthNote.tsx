'use client'

import { useT } from '@lib/i18n/client'
import { ShieldCheckIcon } from '@widgets/ellieo/icons'

/** Ellieo sign-in/sign-up: why we ask for a school or work email (brief §3) */
export function EllieoAuthNote() {
  const t = useT('auth')
  return (
    <div className='mt-3 flex gap-2.5 rounded-xl bg-[var(--ellieo-jade-soft)] px-3.5 py-3 text-[13px] leading-relaxed text-[#0b5c45]'>
      <ShieldCheckIcon className='mt-0.5 size-[18px] shrink-0' />
      <p>{t('ellieo.verifyNote')}</p>
    </div>
  )
}
