import { createHash } from 'node:crypto'

import { rest } from './entitlements.server'

/**
 * Beneficiary purchase ids (supabase/parent_links.sql `premium_beneficiary_accounts`): a parent buying Premium in the
 * app for a linked child puts these on the purchase instead of their own ids —
 *   iOS: appAccountToken = apple_token · Android: obfuscatedAccountId = google_account_id.
 * The purchase handlers resolve them to user_uid = child, payer_uid = parent, so the child gets Premium — also when
 * the parent restores purchases on their own phone (the token on the transaction decides, never the reporting account).
 */

export type Beneficiary = { userUid: string; payerUid: string }

export function googleBeneficiaryIdFor(childUid: string, payerUid: string) {
  const salt = process.env.GOOGLE_PLAY_ACCOUNT_SALT?.trim() || 'misaeng-play'
  return createHash('sha256').update(`${salt}:family:${childUid}:${payerUid}`).digest('hex')
}

type Row = { apple_token: string; google_account_id: string; user_uid: string; payer_uid: string }
const SELECT = 'apple_token,google_account_id,user_uid,payer_uid'
const enc = encodeURIComponent

/** → { appAccountToken, googleAccountId } for a purchase `payerUid` makes for `childUid` (created on first use). */
export async function beneficiaryIdsFor(childUid: string, payerUid: string) {
  const read = async () => {
    const res = await rest(
      `premium_beneficiary_accounts?select=${SELECT}&user_uid=eq.${enc(childUid)}&payer_uid=eq.${enc(payerUid)}&limit=1`,
    )
    if (!res.ok) throw new Error(`Reading premium_beneficiary_accounts failed (HTTP ${res.status}).`)
    return ((await res.json()) as Row[])[0] ?? null
  }
  let row = await read()
  if (!row) {
    // A concurrent insert of the same pair hits unique (user_uid, payer_uid): ignore and read again.
    await rest('premium_beneficiary_accounts', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        user_uid: childUid,
        payer_uid: payerUid,
        google_account_id: googleBeneficiaryIdFor(childUid, payerUid),
      }),
    })
    row = await read()
  }
  if (!row) throw new Error('Could not create the beneficiary ids.')
  return { appAccountToken: row.apple_token, googleAccountId: row.google_account_id }
}

/** The child + parent behind an appAccountToken, or null (not a beneficiary token / table missing). */
export async function beneficiaryOfAppleToken(token: string | undefined | null): Promise<Beneficiary | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null
  const res = await rest(`premium_beneficiary_accounts?select=${SELECT}&apple_token=eq.${enc(token.toLowerCase())}&limit=1`).catch(
    () => null,
  )
  if (!res?.ok) return null
  const row = ((await res.json()) as Row[])[0]
  return row ? { userUid: row.user_uid, payerUid: row.payer_uid } : null
}

/** The child + parent behind an obfuscated Play account id (only when the id still matches its hash). */
export async function beneficiaryOfGoogleAccount(accountId: string | undefined | null): Promise<Beneficiary | null> {
  if (!accountId || !/^[0-9a-f]{64}$/.test(accountId)) return null
  const res = await rest(`premium_beneficiary_accounts?select=${SELECT}&google_account_id=eq.${accountId}&limit=1`).catch(
    () => null,
  )
  if (!res?.ok) return null
  const row = ((await res.json()) as Row[])[0]
  if (!row || googleBeneficiaryIdFor(row.user_uid, row.payer_uid) !== accountId) return null
  return { userUid: row.user_uid, payerUid: row.payer_uid }
}
