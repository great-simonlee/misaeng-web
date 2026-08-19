export function CorporateFooter() {
  return (
    <footer className='border-t border-[#F64310]/20 bg-[#0f172a] text-sm text-white/80'>
      {/* 모바일: 브랜드 + 저작권만 */}
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 sm:hidden'>
        <p className='text-[13px] font-medium text-white/90'>Misaeng</p>
        <p className='text-[11px] text-white/50'>© 2026 Misaeng LLC</p>
      </div>

      {/* 데스크톱 */}
      <div className='mx-auto hidden w-full max-w-7xl min-w-0 flex-row items-start justify-between gap-6 px-4 py-8 sm:flex sm:px-6 lg:px-8'>
        <div className='min-w-0 space-y-1.5'>
          <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
            US Headquarters
          </div>
          <p className='max-w-xs text-base leading-relaxed text-white/90'>
            45 Rockefeller Plaza, Fl 20, New York, NY 10111
          </p>
        </div>
        <div className='min-w-0 space-y-1.5'>
          <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
            Status
          </div>
          <p className='max-w-xs text-base leading-relaxed text-white/90'>
            Official launch: <strong className='text-white'>Spring 2026</strong>.
            <br />
            Currently in controlled market rollout.
          </p>
        </div>
        <div className='min-w-0 space-y-1.5'>
          <div className='text-xs font-semibold uppercase tracking-[0.2em] text-white/60'>
            Corporate
          </div>
          <p className='text-base text-white/90'>
            © 2026 Misaeng LLC. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
