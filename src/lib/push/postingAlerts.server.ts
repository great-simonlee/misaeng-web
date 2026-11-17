import { isAccountSuspended } from '@lib/community/schoolGate'
import { getSupabaseProfile, type SupabaseProfileRecord } from '@lib/supabase/profile.server'

/*
 * Who gets the new job postings push (postings_digest, Mon–Fri 13:00). Owner 2026-11-17: for now members who verified
 * a school or whose workplace is approved (same rule as the app's `identityVerified`, /api/app/me); a pending or
 * rejected workplace alone doesn't count. Later this becomes a paid service (Stripe): change only this check.
 */

export function canReceivePostingAlerts(profile: SupabaseProfileRecord | null): boolean {
  if (!profile || isAccountSuspended(profile)) return false
  return Boolean(profile.schoolEmailVerified) || profile.workplaceStatus === 'approved'
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
 * The users (of `userIds`) who may get the postings push. A profile that can't be read is tried once more (a
 * Storage hiccup at 13:00 must not silently skip people); still unreadable → no push for them, and the log says how many.
 */
export async function postingAlertUsers(userIds: string[]): Promise<string[]> {
  const allowed: string[] = []
  const first = await readProfiles(userIds)
  let missing: string[] = []
  userIds.forEach((uid, k) => {
    if (first[k] === null) missing.push(uid)
    else if (canReceivePostingAlerts(first[k])) allowed.push(uid)
  })
  if (missing.length) {
    const retry = await readProfiles(missing)
    const still: string[] = []
    missing.forEach((uid, k) => {
      if (retry[k] === null) still.push(uid)
      else if (canReceivePostingAlerts(retry[k])) allowed.push(uid)
    })
    missing = still
  }
  // getSupabaseProfile is null for "no profile" too (404), so this counts accounts without a profile as well
  if (missing.length) console.error(`Postings push: ${missing.length} of ${userIds.length} profiles unreadable or missing`)
  return allowed
}
