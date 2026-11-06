import { createSign } from 'node:crypto'

import type { ApnsMessage } from './apns.server'

/**
 * Firebase Cloud Messaging (HTTP v1) for the Android app. No SDK: an OAuth token from a service-account JWT.
 * FCM_SERVICE_ACCOUNT = the Firebase project's service-account JSON (raw JSON or base64 of it),
 * from Firebase console → Project settings → Service accounts → Generate new private key (project new-misaeng).
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string }

export type FcmResult = { token: string; ok: boolean; status: number; reason?: string; unregistered: boolean }

let account: ServiceAccount | null | undefined

function serviceAccount(): ServiceAccount | null {
  if (account !== undefined) return account
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim()
  account = null
  if (!raw) return account
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(text) as Partial<ServiceAccount>
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      account = {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, '\n'),
      }
    }
  } catch {
    console.error('FCM_SERVICE_ACCOUNT is not valid JSON.')
  }
  return account
}

export function isFcmConfigured() {
  return Boolean(serviceAccount())
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

let cachedToken: { value: string; expiresAt: number } | null = null

/** OAuth access token for FCM (valid 1 hour; reused for 50 minutes). */
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 600 > now) return cachedToken.value
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const jwt = `${header}.${claims}.${base64url(signer.sign(sa.private_key))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in || 3600) }
  return cachedToken.value
}

/**
 * Sends one message to each Android device. The app builds the notification itself from the data payload
 * (title, body, plus the same `data` keys iOS gets: type, postId, …), so tapping opens the same screen as on iOS.
 */
export async function sendFcm(devices: { token: string }[], message: ApnsMessage): Promise<FcmResult[]> {
  const sa = serviceAccount()
  if (!sa || devices.length === 0) return []
  const token = await accessToken(sa)
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`
  const data: Record<string, string> = { ...(message.data ?? {}), title: message.title, body: message.body }
  if (message.threadId) data.threadId = message.threadId

  return Promise.all(
    devices.map(async (device): Promise<FcmResult> => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token: device.token, data, android: { priority: 'high' } } }),
        })
        if (res.ok) return { token: device.token, ok: true, status: res.status, unregistered: false }
        const body = (await res.json().catch(() => ({}))) as {
          error?: { status?: string; details?: { errorCode?: string }[] }
        }
        const code = body.error?.details?.find((d) => d.errorCode)?.errorCode || body.error?.status
        // UNREGISTERED: app removed / token rotated. INVALID_ARGUMENT on a token: never valid.
        const unregistered = res.status === 404 || code === 'UNREGISTERED' || (res.status === 400 && code === 'INVALID_ARGUMENT')
        return { token: device.token, ok: false, status: res.status, reason: code, unregistered }
      } catch (error) {
        return { token: device.token, ok: false, status: 0, reason: String(error), unregistered: false }
      }
    }),
  )
}
