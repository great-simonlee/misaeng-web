import { Be_Vietnam_Pro } from 'next/font/google'

/**
 * Ellieo 글꼴 (브리프 8장). en·vi 모두 같은 글꼴. latin + vietnamese, 400/500/600/700.
 * next/font 옵션은 리터럴만 받으므로 preload를 브랜드별로 나눌 수 없다.
 * globals.css `[data-brand='ellieo']`에서 `--font-ellieo-stack`으로 body에 연결한다.
 */
export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  // 한 코드베이스라 Misaeng 빌드에도 이 모듈이 들어간다. Misaeng 첫 화면에 Ellieo 글꼴 preload가 붙지 않게 끈다.
  preload: false,
  variable: '--font-ellieo',
})
