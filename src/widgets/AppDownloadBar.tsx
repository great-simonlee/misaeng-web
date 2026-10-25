import Image from 'next/image'
import Link from 'next/link'

/** 회사 사이트 하단 고정 바 — Ellieo 앱 다운로드 유도 (/mobile-app) */
export function AppDownloadBar() {
  return (
    <aside
      className='fixed inset-x-0 bottom-0 z-[9990] bg-[#0f172a] shadow-[0_-8px_30px_rgba(15,23,42,0.35)]'
      aria-label='Download the Ellieo app'
    >
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8'>
        <div className='flex min-w-0 items-center gap-2.5 sm:gap-3'>
          {/* 푸터 Misaeng 로고와 같은 크기 (28px 칸 안에 20px 아이콘) */}
          <span className='inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95'>
            <Image src='/img/ellieo_logo.png' alt='' width={28} height={28} className='size-5 object-contain' aria-hidden />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-white sm:text-[15px]'>Get the Ellieo app</p>
            <p className='hidden truncate text-xs text-white/65 sm:block'>
              Misaeng&apos;s NYC housing &amp; roommate app · Live on the App Store &amp; Google Play
            </p>
          </div>
        </div>

        <Link
          href='/mobile-app'
          className='inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover sm:px-5 sm:text-sm'
        >
          Download
        </Link>
      </div>
    </aside>
  )
}

/** 고정 바에 가려지지 않도록 페이지 맨 아래에 같은 높이만큼 비워 둔다 */
export function AppDownloadBarSpacer() {
  return <div className='h-14 bg-[#0b1220] sm:h-[68px]' aria-hidden />
}
