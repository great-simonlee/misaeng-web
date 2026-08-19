/** Ellieo AppConnect 기본 API (로컬·Vercel 공통 fallback) */
export const DEFAULT_APP_CONNECT_API_BASE_URL =
  'https://ellieo.com/v1/api'

export function resolveAppConnectBaseUrl() {
  const raw =
    process.env.APP_CONNECT_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_CONNECT_API_BASE_URL?.trim() ||
    ''

  const base = raw || DEFAULT_APP_CONNECT_API_BASE_URL
  return base.replace(/\/$/, '')
}

export function isAppConnectConfigured() {
  return Boolean(resolveAppConnectBaseUrl())
}

export function resolveAppConnectDeviceId() {
  return (
    process.env.APP_CONNECT_DEVICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_APP_CONNECT_DEVICE_ID?.trim() ||
    'misaeng-web'
  )
}
