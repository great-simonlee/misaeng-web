import { sendStaffPush } from '@lib/support/staffPush.server'
import { BRAND_CONFIG } from '@lib/brand'

/**
 * A brand-new member (email verified, or first Google / Apple sign-in with consent) → a push in the Misaeng ERP app to
 * the Super Admin: "New sign-up" + the member's email. English like every staff-app text. Never throws.
 */
const SIGNUP_ALERT_TO = 'simon@misaeng.com'

export function notifyNewSignup(email: string | null | undefined, method: 'email' | 'google' | 'apple') {
  const address = String(email || '').trim()
  void sendStaffPush([SIGNUP_ALERT_TO], {
    title: 'New sign-up',
    body: address || '(no email)',
    subtitle: `${BRAND_CONFIG.name} · ${method === 'email' ? 'Email' : method === 'google' ? 'Google' : 'Apple'}`,
    threadId: 'new-signups',
    data: { type: 'signup' },
  }).catch((error) => console.error('[signup alert]', error))
}
