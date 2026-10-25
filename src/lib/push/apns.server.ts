import { createPrivateKey, sign } from 'node:crypto'
import { connect, type ClientHttp2Session } from 'node:http2'

/**
 * Apple Push Notification service (HTTP/2 + token auth). No SDK: a JWT signed with a .p8 key.
 * Either one "Sandbox & Production" key (APNS_KEY_ID + APNS_KEY), or one key per environment:
 *   APNS_KEY_ID + APNS_KEY                  production (TestFlight / App Store builds)
 *   APNS_SANDBOX_KEY_ID + APNS_SANDBOX_KEY  sandbox (builds installed from Xcode); falls back to APNS_KEY
 * APNS_TEAM_ID, APNS_BUNDLE_ID (default com.misaeng.nyc). Key contents may use \n for newlines.
 */

export type ApnsEnvironment = 'sandbox' | 'production'

export type ApnsMessage = {
  title: string
  body: string
  /** Custom data the app reads when the notification is tapped (e.g. { type, postId }). */
  data?: Record<string, string>
  /** Notifications with the same thread are grouped on the lock screen. */
  threadId?: string
}

export type ApnsResult = { token: string; ok: boolean; status: number; reason?: string; unregistered: boolean }

const HOSTS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

type SigningKey = { keyId: string; pem: string }

function keyFromEnv(prefix: string): SigningKey | null {
  const keyId = process.env[`${prefix}KEY_ID`]?.trim()
  const pem = process.env[`${prefix}KEY`]?.replace(/\\n/g, '\n').trim()
  return keyId && pem ? { keyId, pem } : null
}

/** Sandbox uses APNS_SANDBOX_* when set, otherwise the main key (a "Sandbox & Production" key covers both). */
function signingKey(environment: ApnsEnvironment): SigningKey | null {
  if (environment === 'sandbox') return keyFromEnv('APNS_SANDBOX_') ?? keyFromEnv('APNS_')
  return keyFromEnv('APNS_')
}

export function isApnsConfigured(environment?: ApnsEnvironment) {
  if (!process.env.APNS_TEAM_ID?.trim()) return false
  return environment ? Boolean(signingKey(environment)) : Boolean(signingKey('production') || signingKey('sandbox'))
}

function bundleId() {
  return process.env.APNS_BUNDLE_ID?.trim() || 'com.misaeng.nyc'
}

const cachedJwt = new Map<ApnsEnvironment, { value: string; issuedAt: number }>()

/** Apple accepts a provider token for up to 60 minutes; reuse it for 50. */
function providerToken(environment: ApnsEnvironment): string {
  const now = Math.floor(Date.now() / 1000)
  const cached = cachedJwt.get(environment)
  if (cached && now - cached.issuedAt < 50 * 60) return cached.value

  const { keyId, pem } = signingKey(environment)!
  const teamId = process.env.APNS_TEAM_ID!.trim()
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({ alg: 'ES256', kid: keyId })}.${encode({ iss: teamId, iat: now })}`
  const signature = sign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey(pem),
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url')
  const value = `${unsigned}.${signature}`
  cachedJwt.set(environment, { value, issuedAt: now })
  return value
}

const sessions = new Map<ApnsEnvironment, ClientHttp2Session>()

function session(environment: ApnsEnvironment): ClientHttp2Session {
  const existing = sessions.get(environment)
  if (existing && !existing.closed && !existing.destroyed) return existing
  const created = connect(HOSTS[environment])
  created.on('error', () => sessions.delete(environment))
  created.on('close', () => sessions.delete(environment))
  // Do not keep a serverless instance alive just for this connection.
  created.unref()
  sessions.set(environment, created)
  return created
}

function sendOne(environment: ApnsEnvironment, token: string, payload: string, threadId?: string): Promise<ApnsResult> {
  return new Promise((resolve) => {
    let request
    try {
      request = session(environment).request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${providerToken(environment)}`,
        'apns-topic': bundleId(),
        'apns-push-type': 'alert',
        'apns-priority': '10',
        ...(threadId ? { 'apns-collapse-id': threadId.slice(0, 64) } : {}),
        'content-type': 'application/json',
      })
    } catch (error) {
      resolve({ token, ok: false, status: 0, reason: String(error), unregistered: false })
      return
    }
    let status = 0
    let body = ''
    const timer = setTimeout(() => request.close(), 10_000)
    request.on('response', (headers) => {
      status = Number(headers[':status']) || 0
    })
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      clearTimeout(timer)
      let reason: string | undefined
      try {
        reason = body ? (JSON.parse(body) as { reason?: string }).reason : undefined
      } catch {
        reason = body.slice(0, 200)
      }
      // 410 Unregistered / 400 BadDeviceToken: the app was deleted or the token belongs to the other environment.
      const unregistered = status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered'
      resolve({ token, ok: status === 200, status, reason, unregistered })
    })
    request.on('error', (error) => {
      clearTimeout(timer)
      resolve({ token, ok: false, status, reason: String(error), unregistered: false })
    })
    request.end(payload)
  })
}

export async function sendApns(
  devices: { token: string; environment: ApnsEnvironment }[],
  message: ApnsMessage,
): Promise<ApnsResult[]> {
  // Devices whose environment has no key yet are skipped (not removed).
  devices = devices.filter((d) => isApnsConfigured(d.environment))
  if (devices.length === 0) return []
  const payload = JSON.stringify({
    aps: {
      alert: { title: message.title, body: message.body },
      sound: 'default',
      ...(message.threadId ? { 'thread-id': message.threadId } : {}),
    },
    ...(message.data ?? {}),
  })
  return Promise.all(devices.map((d) => sendOne(d.environment, d.token, payload, message.threadId)))
}
