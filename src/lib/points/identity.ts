/**
 * Email normalization for anti-farming (spec 3.1.1 / 3.4): lower-case, and for Gmail
 * (gmail.com / googlemail.com) dots and "+tag" are removed and the domain becomes gmail.com.
 *   "A.B.Lee+misaeng@GoogleMail.com" → "ablee@gmail.com"
 * Other domains: lower-case only ("+tags" can be real mailbox names elsewhere).
 */
export function normalizeEmailForPoints(email: string | null | undefined): string | null {
  const raw = String(email || '').trim().toLowerCase()
  const at = raw.lastIndexOf('@')
  if (at <= 0 || at === raw.length - 1) return null
  let local = raw.slice(0, at)
  let domain = raw.slice(at + 1)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.split('+')[0].replace(/\./g, '')
    domain = 'gmail.com'
    if (!local) return null
  }
  return `${local}@${domain}`
}

export function normalizeInstagramForPoints(handle: string | null | undefined): string | null {
  const value = String(handle || '').trim().replace(/^@+/, '').toLowerCase()
  return value || null
}

export type PointIdentityKind = 'signup_email' | 'school_email' | 'work_email' | 'instagram'
