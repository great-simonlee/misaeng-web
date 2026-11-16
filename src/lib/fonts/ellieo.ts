import { Inter } from 'next/font/google'

/**
 * Ellieo font: Inter (variable, 100–900), latin + vietnamese — same font for en and vi (user 11-16).
 * next/font only takes literals, so preload can't be split per brand.
 * Hooked up in globals.css `[data-brand='ellieo']` as `--font-ellieo-stack`.
 */
export const ellieoInter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  // One codebase: keep the Ellieo font from being preloaded on Misaeng's first paint
  preload: false,
  variable: '--font-ellieo',
})
