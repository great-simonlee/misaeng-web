import { BRAND_CONFIG } from '@lib/brand'

/** Misaeng's city-site redesign (2026-11) is Misaeng only: Ellieo keeps its own (classic) look and never shares it. */
export const MISAENG_DESIGN = BRAND_CONFIG.id === 'misaeng'

/** Class names: Misaeng's redesign, or Ellieo's classic ones. */
export function byBrand(misaeng: string, classic: string) {
  return MISAENG_DESIGN ? misaeng : classic
}
