import { getSupabaseServiceClient } from '@lib/supabase/server'

/**
 * Shared pieces of Ellieo credits (listingPlans, credits, inHouse, promotions, appleCredits): the error type and the
 * SQL function caller. SQL: ellieo-app/shared/ellieo/db/agent_listing_pay.sql + credits_paid_only.sql.
 */

/** $1 = 10 credits (owner 11-25). Pack bonuses are measured against this. */
export const CREDITS_PER_DOLLAR = 10

export class CreditsError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

export const SQL_ERRORS: Record<string, [string, number]> = {
  NOT_ENOUGH_CREDITS: ['Not enough credits. Top up to continue.', 402],
  NOT_FOUND: ['Not found.', 404],
  NOT_BROKERED: ['Only brokered listings have plans.', 400],
  NOT_AVAILABLE: ['This listing can no longer be changed.', 409],
  INVALID_PLAN: ['Pick 7, 14 or 28 days, or Premium.', 400],
  PREMIUM_ACTIVE: ['This listing is already Premium.', 409],
  ALREADY_RESERVED: ['This listing is already waiting for a Premium spot.', 409],
  SLOTS_FULL: ['All Premium spots are taken. Reserve the next one instead.', 409],
  SLOT_OPEN: ['A Premium spot is open now — buy Premium instead of reserving.', 409],
  NOT_PREMIUM: ['Only an active Premium listing can be extended.', 409],
  ALREADY_EXTENDED: ['Premium can be extended only once.', 409],
  INVALID_AMOUNT: ['Enter a whole number of credits.', 400],
  INVALID_PRICES: ['Prices are not valid.', 400],
  NOTE_REQUIRED: ['Add a note (who it is for and why).', 400],
  NOTHING_TO_ADJUST: ['Nothing is left of that purchase to take back.', 409],
  NOT_REFUNDABLE: ['This purchase can no longer be refunded (more than 7 days, or some credits were used).', 409],
  NOT_IN_HOUSE: ['This member is not in-house.', 409],
  PROMO_ENDED: ['This offer has ended. Try again.', 409],
  INVALID: ['Invalid request.', 400],
}

export function db() {
  return getSupabaseServiceClient()
}

export function setupRequired() {
  return new CreditsError('Credits are not set up yet (run credits_paid_only.sql).', 'SETUP_REQUIRED', 503)
}

export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args as never)
  if (error) {
    const code = /ellieo:([A-Z_]+)/.exec(error.message)?.[1]
    if (code && SQL_ERRORS[code]) throw new CreditsError(SQL_ERRORS[code][0], code, SQL_ERRORS[code][1])
    if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01' || error.code === 'PGRST205') {
      throw setupRequired()
    }
    throw new CreditsError(`Credits failed: ${error.message}`, 'SERVER_ERROR', 500)
  }
  return data as T
}

/** Supabase "table missing" codes → SETUP_REQUIRED. */
export function isMissingTable(code: string | undefined) {
  return code === '42P01' || code === 'PGRST205'
}
