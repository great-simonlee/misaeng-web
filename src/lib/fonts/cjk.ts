import { Noto_Sans_JP, Noto_Sans_SC, Noto_Sans_TC } from 'next/font/google'

/**
 * 일본어·중국어 화면/원문용 글꼴. Pretendard는 한국어 한자 모양이라 `lang`에 맞는 글꼴을 앞에 둔다
 * (globals.css의 `:lang(ja)` 등). 해당 언어 글자가 나올 때만 내려받도록 preload하지 않는다.
 */
export const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-jp',
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
})

export const notoSansSc = Noto_Sans_SC({
  variable: '--font-noto-sc',
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
})

export const notoSansTc = Noto_Sans_TC({
  variable: '--font-noto-tc',
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
})

export const cjkFontVariables = `${notoSansJp.variable} ${notoSansSc.variable} ${notoSansTc.variable}`
