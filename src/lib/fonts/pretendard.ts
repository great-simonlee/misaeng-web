import localFont from 'next/font/local'

/**
 * 사이트 기본 글꼴 (Pretendard, 자체 호스팅).
 * 한글 글꼴이라 굵기마다 약 0.8MB — 전부 preload하면 첫 화면이 무거워지므로
 * 실제로 쓰인 굵기만 브라우저가 내려받게 한다.
 */
export const pretendard = localFont({
  src: [
    { path: './Pretendard-Light.woff2', weight: '300', style: 'normal' },
    { path: './Pretendard-Regular.woff2', weight: '400', style: 'normal' },
    { path: './Pretendard-Medium.woff2', weight: '500', style: 'normal' },
    { path: './Pretendard-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './Pretendard-Bold.woff2', weight: '700', style: 'normal' },
    { path: './Pretendard-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: false,
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Apple SD Gothic Neo',
    'Malgun Gothic',
    'sans-serif',
  ],
})
