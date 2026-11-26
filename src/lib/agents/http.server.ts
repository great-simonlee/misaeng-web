import { NextResponse } from 'next/server'

import { BRAND } from '@lib/brand'
import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'

import { AgentLicenseError } from './agentLicense.server'
import { creditsEnabled } from './creditsCore.server'
import { CreditsError } from './listingPlans.server'
import { ListingError } from './listings.server'

/** Misaeng-only routes (agent accounts, agent listings, credits): 404 on the Ellieo build (same codebase). */
export function notMisaeng() {
  return BRAND === 'misaeng' ? null : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/** Credits routes: 404 { code: 'CREDITS_OFF' } while credits are switched off (misaeng_settings credits_enabled). */
export async function creditsOff() {
  if (await creditsEnabled().catch(() => false)) return null
  return NextResponse.json({ error: 'Credits are not available yet.', code: 'CREDITS_OFF' }, { status: 404 })
}

export async function signedInUid() {
  return (await resolveAuthenticatedUser())?.uid ?? null
}

export function loginRequired() {
  return NextResponse.json({ error: '로그인이 필요해요. / Log in to continue.', code: 'LOGIN_REQUIRED' }, { status: 401 })
}

export function errorResponse(error: unknown, where: string) {
  if (error instanceof ListingError || error instanceof AgentLicenseError || error instanceof CreditsError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error(`Misaeng ${where} error:`, error)
  return NextResponse.json({ error: 'Something went wrong. Try again.', code: 'SERVER_ERROR' }, { status: 500 })
}

/** JSON body or {} (a bad body is treated as empty; the handlers validate fields). */
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
