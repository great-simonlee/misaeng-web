import Link from 'next/link'

interface AuthConfigBannerProps {
  className?: string
}

export function AuthConfigBanner({ className }: AuthConfigBannerProps) {
  return (
    <div
      className={
        className ??
        'rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900 sm:px-4 sm:text-sm'
      }
    >
      AppConnect API가 아직 설정되지 않았습니다.{' '}
      <code className='break-all font-mono text-[11px] sm:text-xs'>
        APP_CONNECT_API_BASE_URL
      </code>
      과 Google 로그인용{' '}
      <code className='break-all font-mono text-[11px] sm:text-xs'>
        NEXT_PUBLIC_GOOGLE_CLIENT_ID
      </code>
      를 환경 변수에 넣어 주세요 (
      <code className='break-all font-mono text-[11px] sm:text-xs'>.env.example</code>{' '}
      참고).{' '}
      <Link
        href='/nyc/login'
        className='font-semibold underline-offset-2 hover:underline'
      >
        로그인 페이지
      </Link>
    </div>
  )
}
