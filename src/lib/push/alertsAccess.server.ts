import { isAccountSuspended } from '@lib/community/schoolGate'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

/*
 * Who gets Ellieo's alerts — new job postings and visa / status news (owner 2026-11-19): members who verified a
 * school email or whose workplace is approved. A pending or rejected workplace alone doesn't count, nor does a
 * suspended account.
 *
 * Later (owner): only verified members who also pay get them (Stripe). That is the one change to make here, in
 * `canReceiveAlerts` — the digest broadcast and every other caller go through it.
 */

export function isVerifiedMember(profile: SupabaseProfileRecord | null): boolean {
  if (!profile || isAccountSuspended(profile)) return false
  return Boolean(profile.schoolEmailVerified) || profile.workplaceStatus === 'approved'
}

export function canReceiveAlerts(profile: SupabaseProfileRecord | null): boolean {
  // TODO(payments): && hasActiveAlertsSubscription(profile)
  return isVerifiedMember(profile)
}

/** Profiles of `uids`, 20 at a time; null where the read failed. */
async function readProfiles(uids: string[]): Promise<(SupabaseProfileRecord | null)[]> {
  const out: (SupabaseProfileRecord | null)[] = []
  for (let i = 0; i < uids.length; i += 20) {
    out.push(...(await Promise.all(uids.slice(i, i + 20).map((uid) => getSupabaseProfile(uid).catch(() => null)))))
  }
  return out
}

/**
 * The users (of `userIds`) who may get an alert. A profile that can't be read is tried once more (a hiccup at send
 * time must not silently skip people); still unreadable → no alert for them, and the log says how many.
 */
export async function alertUsers(userIds: string[]): Promise<string[]> {
  const allowed: string[] = []
  const first = await readProfiles(userIds)
  let missing: string[] = []
  userIds.forEach((uid, k) => {
    if (first[k] === null) missing.push(uid)
    else if (canReceiveAlerts(first[k])) allowed.push(uid)
  })
  if (missing.length) {
    const retry = await readProfiles(missing)
    const still: string[] = []
    missing.forEach((uid, k) => {
      if (retry[k] === null) still.push(uid)
      else if (canReceiveAlerts(retry[k])) allowed.push(uid)
    })
    missing = still
  }
  // getSupabaseProfile is null for "no profile" too (404), so this counts accounts without a profile as well
  if (missing.length) console.error(`Alerts: ${missing.length} of ${userIds.length} profiles unreadable or missing`)
  return allowed
}
