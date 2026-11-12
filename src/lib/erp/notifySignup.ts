import { sendStaffPush, SUPER_ADMIN_EMAIL } from '@lib/support/staffPush.server'
import { BRAND_CONFIG } from '@lib/brand'

/**
 * A new Misaeng login (email verified, or first Google / Apple sign-in with consent) → a push in the Misaeng ERP app to
 * the Super Admin: "New sign-up" + the member's email; tap → Misaeng › Users. English like every staff-app text.
 * `uid`: the member's Misaeng id (the app opens them). `returning`: an old Ellieo member (legacy_users) who just made their Misaeng login — still a sign-up on Misaeng.
 * Never throws.
 */
export function notifyNewSignup(
  email: string | null | undefined,
  method: 'email' | 'google' | 'apple',
  returning = false,
  uid: string | null = null,
) {
  const address = String(email || '').trim()
  const via = method === 'email' ? 'Email' : method === 'google' ? 'Google' : 'Apple'
  void sendStaffPush([SUPER_ADMIN_EMAIL], {
    title: 'New sign-up',
    body: address || '(no email)',
    subtitle: [BRAND_CONFIG.name, via, returning ? 'Existing Ellieo member' : ''].filter(Boolean).join(' · '),
    threadId: 'new-signups',
    // uid: the app opens that member in Misaeng › Users
    data: { type: 'signup', ...(uid ? { uid } : {}) },
  }).catch((error) => console.error('[signup alert]', error))
}
