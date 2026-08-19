import Link from 'next/link'

interface SupabaseConfigBannerProps {
  className?: string
}

export function SupabaseConfigBanner({ className }: SupabaseConfigBannerProps) {
  return (
    <div
      className={
        className ??
        'rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900 sm:px-4 sm:text-sm'
      }
    >
      Supabase 연동 환경 변수가 아직 설정되지 않았습니다.{' '}
      <code className='break-all font-mono text-[11px] sm:text-xs'>.env.local</code>
      에 Supabase 값을 넣어 주세요 (
      <code className='break-all font-mono text-[11px] sm:text-xs'>.env.example</code>{' '}
      참고). 설정 전에는 화면은 볼 수 있지만 데이터 저장·프로필 사진 업로드는
      동작하지 않습니다.{' '}
      <Link
        href='/nyc/login'
        className='font-semibold underline-offset-2 hover:underline'
      >
        로그인 페이지
      </Link>
    </div>
  )
}