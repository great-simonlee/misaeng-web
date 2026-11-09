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
  /** Second bold line under the title (iOS). */
  subtitle?: string
  body: string
  /** A sound file in the app bundle (e.g. "lead.caf"); default "default". Focus / silent mode still mute it. */
  sound?: string
  /** Lets the app's Notification Service Extension rewrite the alert (e.g. a messaging-style notification with the sender). */
  mutableContent?: boolean
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

/**
 * One HTTP/2 connection per environment, reused between pushes. misaeng.com sits behind an AWS NAT gateway, which
 * silently drops a connection after 350 s without traffic: the next push on it then failed with ECONNRESET and was
 * lost (most alerts, since they come minutes apart). So a connection idle for MAX_IDLE_MS is replaced before use, and
 * a push that got no answer from Apple at all is sent once more on a fresh connection.
 */
const MAX_IDLE_MS = 4 * 60_000
const REQUEST_TIMEOUT_MS = 10_000

const sessions = new Map<ApnsEnvironment, { session: ClientHttp2Session; usedAt: number }>()

function forgetSession(environment: ApnsEnvironment, target: ClientHttp2Session) {
  if (sessions.get(environment)?.session !== target) return
  sessions.delete(environment)
  if (!target.closed && !target.destroyed) target.close()
}

function session(environment: ApnsEnvironment): ClientHttp2Session {
  const now = Date.now()
  const existing = sessions.get(environment)
  if (existing) {
    const { session: open, usedAt } = existing
    if (!open.closed && !open.destroyed && now - usedAt < MAX_IDLE_MS) {
      existing.usedAt = now
      return open
    }
    forgetSession(environment, open)
  }
  const created = connect(HOSTS[environment])
  const forget = () => forgetSession(environment, created)
  created.on('error', forget)
  created.on('goaway', forget)
  created.on('close', forget)
  // Do not keep a serverless instance alive just for this connection.
  created.unref()
  sessions.set(environment, { session: created, usedAt: now })
  return created
}

/** `retryable`: Apple never answered (connection reset / refused), so the push was not delivered and can be resent. */
type Attempt = ApnsResult & { retryable: boolean }

function attempt(environment: ApnsEnvironment, token: string, payload: string, threadId?: string, topic?: string): Promise<Attempt> {
  return new Promise((resolve) => {
    let connection: ClientHttp2Session
    let request
    try {
      connection = session(environment)
      request = connection.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${providerToken(environment)}`,
        'apns-topic': topic || bundleId(),
        'apns-push-type': 'alert',
        'apns-priority': '10',
        ...(threadId ? { 'apns-collapse-id': threadId.slice(0, 64) } : {}),
        'content-type': 'application/json',
      })
    } catch (error) {
      resolve({ token, ok: false, status: 0, reason: String(error), unregistered: false, retryable: true })
      return
    }
    let status = 0
    let body = ''
    let settled = false
    const finish = (result: Attempt) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      // No HTTP answer: this connection is dead, the next push (or the retry) opens a new one
      if (result.status === 0) forgetSession(environment, connection)
      resolve(result)
    }
    // Timed out: Apple may still have delivered it, so it is not resent (no duplicate notification)
    const timer = setTimeout(() => {
      finish({ token, ok: false, status, reason: 'Timeout', unregistered: false, retryable: false })
      request.close()
    }, REQUEST_TIMEOUT_MS)
    request.on('response', (headers) => {
      status = Number(headers[':status']) || 0
    })
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      let reason: string | undefined
      try {
        reason = body ? (JSON.parse(body) as { reason?: string }).reason : undefined
      } catch {
        reason = body.slice(0, 200)
      }
      // 410 Unregistered / 400 BadDeviceToken: the app was deleted or the token belongs to the other environment.
      const unregistered = status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered'
      finish({ token, ok: status === 200, status, reason, unregistered, retryable: status === 0 })
    })
    request.on('error', (error) => {
      finish({ token, ok: false, status, reason: String(error), unregistered: false, retryable: status === 0 })
    })
    // Stream closed without 'end' / 'error' (e.g. the session went away): never leave the push hanging
    request.on('close', () => {
      finish({ token, ok: false, status, reason: status ? undefined : 'Stream closed', unregistered: false, retryable: status === 0 })
    })
    request.end(payload)
  })
}

async function sendOne(environment: ApnsEnvironment, token: string, payload: string, threadId?: string, topic?: string): Promise<ApnsResult> {
  let result = await attempt(environment, token, payload, threadId, topic)
  if (!result.ok && result.retryable) {
    console.warn(`APNs: no answer (${result.reason}), retrying once on a new connection`)
    result = await attempt(environment, token, payload, threadId, topic)
  }
  return { token, ok: result.ok, status: result.status, reason: result.reason, unregistered: result.unregistered }
}

export async function sendApns(
  devices: { token: string; environment: ApnsEnvironment }[],
  message: ApnsMessage,
  /** Another app of the same team (e.g. the staff app "Misaeng ERP"); default APNS_BUNDLE_ID. */
  options: { topic?: string } = {},
): Promise<ApnsResult[]> {
  // Devices whose environment has no key yet are skipped (not removed).
  devices = devices.filter((d) => isApnsConfigured(d.environment))
  if (devices.length === 0) return []
  const payload = JSON.stringify({
    aps: {
      alert: { title: message.title, ...(message.subtitle ? { subtitle: message.subtitle } : {}), body: message.body },
      sound: message.sound || 'default',
      ...(message.mutableContent ? { 'mutable-content': 1 } : {}),
      ...(message.threadId ? { 'thread-id': message.threadId } : {}),
    },
    ...(message.data ?? {}),
  })
  return Promise.all(devices.map((d) => sendOne(d.environment, d.token, payload, message.threadId, options.topic)))
}
