import Link from 'next/link'

interface FirebaseConfigBannerProps {
  className?: string
}

export function FirebaseConfigBanner({ className }: FirebaseConfigBannerProps) {
  return (
    <div
      className={
        className ??
        'rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900 sm:px-4 sm:text-sm'
      }
    >
      Firebase가 아직 설정되지 않았습니다.{' '}
      <code className='break-all font-mono text-[11px] sm:text-xs'>.env.local</code>
      에 프로젝트 키를 넣고 Auth·Firestore를 활성화해 주세요 (
      <code className='break-all font-mono text-[11px] sm:text-xs'>.env.example</code>{' '}
      참고). 설정 전에는 화면은 볼 수 있지만 로그인·글쓰기는 동작하지 않습니다.{' '}
      <Link
        href='/nyc/login'
        className='font-semibold underline-offset-2 hover:underline'
      >
        로그인 페이지
      </Link>
    </div>
  )
}
