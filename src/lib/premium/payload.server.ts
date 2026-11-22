import type { PremiumState } from './access.server'

/** GET /api/premium/me shape (the apps decode this too). Never includes the Stripe customer id. */
export function premiumPayload(state: PremiumState, loggedIn: boolean) {
  return {
    loggedIn,
    premium: state.premium,
    plan: state.plan,
    source: state.source,
    until: state.until,
    status: state.status,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    trialAvailable: loggedIn ? state.trialAvailable : true,
    manageable: state.manageable,
  }
}
