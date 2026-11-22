/**
 * Who sees Premium content. Premium payments are not built yet (design doc: Premium · codes · parent payment), so
 * for now only the emails in PREMIUM_PREVIEW_EMAILS (comma-separated, e.g. staff checking the screens) are Premium.
 * When payments ship this becomes the entitlement check (Stripe / App Store / Google Play / codes / gifts).
 */
export function hasPremiumAccess(user: { email?: string | null } | null): boolean {
  const email = user?.email?.trim().toLowerCase()
  if (!email) return false
  const preview = (process.env.PREMIUM_PREVIEW_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return preview.includes(email)
}
