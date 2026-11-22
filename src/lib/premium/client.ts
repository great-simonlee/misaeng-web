/** Browser calls for Premium (web paywall + Premium sheet). Server routes: src/app/api/premium/*. */

export type PremiumPlanId = 'monthly' | 'season' | 'annual'

export type PremiumMe = {
  loggedIn: boolean
  premium: boolean
  plan: PremiumPlanId | 'code' | 'gift' | 'staff' | null
  source: 'stripe' | 'apple' | 'google' | 'code' | 'gift' | 'staff' | null
  until: string | null
  since: string | null
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | null
  cancelAtPeriodEnd: boolean
  trialAvailable: boolean
  manageable: boolean
  /** The server couldn't read the member's Premium (503): show "try again", never plans or a login button. */
  degraded?: boolean
}

export class PremiumRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new PremiumRequestError(data.error || '', res.status)
  return data
}

export async function fetchPremiumMe(): Promise<PremiumMe | null> {
  try {
    const res = await fetch('/api/premium/me', { cache: 'no-store' })
    if (res.status === 503) {
      return { loggedIn: true, premium: false, plan: null, source: null, until: null, since: null, status: null, cancelAtPeriodEnd: false, trialAvailable: false, manageable: false, degraded: true }
    }
    return res.ok ? ((await res.json()) as PremiumMe) : null
  } catch {
    return null
  }
}

export function startCheckout(plan: PremiumPlanId, city: string, locale: string) {
  return post<{ url: string }>('/api/premium/checkout', { plan, city, locale })
}

export function openBillingPortal(city: string, locale: string) {
  return post<{ url: string }>('/api/premium/portal', { city, locale })
}

/** → until (ISO). Throws PremiumRequestError whose message is the server code (NOT_FOUND, USED_UP, …). */
export function redeemPremiumCode(code: string) {
  return post<{ ok: true; until: string | null }>('/api/premium/redeem', { code })
}
