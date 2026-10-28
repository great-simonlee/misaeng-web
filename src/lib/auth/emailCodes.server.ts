import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

import { authRest, enc } from './store.server'

/*
 * 6-digit codes Misaeng emails itself (school / work email verification; Ellieo sent these before).
 * Only a hash is stored. A code lives 10 minutes and allows 5 tries; a new code needs 60 seconds and at most
 * 6 codes per hour per member and purpose.
 */

export type EmailCodePurpose = 'school_email' | 'work_email'

const TTL_MS = 10 * 60_000
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60_000
const HOURLY_LIMIT = 6

type CodeRow = { id: string; code_hash: string; attempts: number; expires_at: string; used_at: string | null; created_at: string }

const hash = (purpose: string, uid: string, email: string, code: string) =>
  createHash('sha256').update(`${purpose}|${uid}|${email.toLowerCase()}|${code}`).digest('hex')

export class EmailCodeError extends Error {
  constructor(readonly reason: 'cooldown' | 'rate_limited' | 'invalid' | 'expired' | 'too_many_attempts') {
    super(reason)
    this.name = 'EmailCodeError'
  }
}

/** Creates a code (the caller emails it). Throws EmailCodeError('cooldown' | 'rate_limited'). */
export async function issueEmailCode(purpose: EmailCodePurpose, uid: string, email: string) {
  const since = new Date(Date.now() - 60 * 60_000).toISOString()
  const recent = await authRest<CodeRow[]>(
    `email_codes?purpose=eq.${purpose}&uid=eq.${enc(uid)}&created_at=gte.${enc(since)}&select=created_at&order=created_at.desc`,
  )
  if (recent[0] && Date.now() - Date.parse(recent[0].created_at) < RESEND_COOLDOWN_MS) throw new EmailCodeError('cooldown')
  if (recent.length >= HOURLY_LIMIT) throw new EmailCodeError('rate_limited')

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await authRest('email_codes', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      purpose,
      uid,
      email: email.toLowerCase(),
      code_hash: hash(purpose, uid, email, code),
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    },
  })
  return code
}

/** Checks the latest code for this member + email; marks it used. Throws EmailCodeError on failure. */
export async function verifyEmailCode(purpose: EmailCodePurpose, uid: string, email: string, code: string) {
  const rows = await authRest<CodeRow[]>(
    `email_codes?purpose=eq.${purpose}&uid=eq.${enc(uid)}&email=eq.${enc(email.toLowerCase())}&used_at=is.null` +
      `&select=id,code_hash,attempts,expires_at,used_at,created_at&order=created_at.desc&limit=1`,
  )
  const row = rows[0]
  if (!row) throw new EmailCodeError('invalid')
  if (Date.parse(row.expires_at) <= Date.now()) throw new EmailCodeError('expired')
  if (row.attempts >= MAX_ATTEMPTS) throw new EmailCodeError('too_many_attempts')

  const expected = Buffer.from(row.code_hash, 'hex')
  const given = Buffer.from(hash(purpose, uid, email, code.replace(/\D/g, '')), 'hex')
  const ok = expected.length === given.length && timingSafeEqual(expected, given)
  await authRest(`email_codes?id=eq.${row.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: ok ? { used_at: new Date().toISOString() } : { attempts: row.attempts + 1 },
  })
  if (!ok) throw new EmailCodeError(row.attempts + 1 >= MAX_ATTEMPTS ? 'too_many_attempts' : 'invalid')
}
