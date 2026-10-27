import { timingSafeEqual } from 'node:crypto'

/**
 * Server-to-server calls for verification documents (ellieo-erp review screens, the pg_cron cleanup job).
 * Header `x-internal-secret: $INTERNAL_VERIFICATION_SECRET` — a separate secret from the push one, because these
 * routes hand out signed URLs to private documents.
 */
export function isVerificationInternalRequest(request: Request) {
  const secret = process.env.INTERNAL_VERIFICATION_SECRET?.trim()
  const given = request.headers.get('x-internal-secret')?.trim() || ''
  if (!secret || secret.length < 16 || given.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret))
}

/** Reviewer identity passed by the ERP (already verified there with Firebase). Lower-cased email. */
export function reviewerEmailFrom(value: unknown): string | null {
  const email = String(value || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null
}
