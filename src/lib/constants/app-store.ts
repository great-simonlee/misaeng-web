export const APP_STORE_URL = 'https://apps.apple.com/us/app/ellieo/id6753929020'
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.misaeng.ellieo'

export type AppPlatform = 'ios' | 'android' | 'other'

export function detectAppPlatform(userAgent: string): AppPlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios'
  return 'other'
}

export function getStoreUrlForPlatform(platform: AppPlatform): string {
  if (platform === 'android') return PLAY_STORE_URL
  return APP_STORE_URL
}
