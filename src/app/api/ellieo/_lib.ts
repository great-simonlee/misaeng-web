import { NextResponse } from 'next/server'

import { BRAND } from '@lib/brand'
import { ListingError } from '@lib/ellieo/listings.server'
import { MessagingError } from '@lib/ellieo/messaging.server'

import { resolveAuthenticatedUser } from '../agent-auth/lib/authHelpers'

/** Ellieo-only routes: 404 on the Misaeng build (same codebase). */
export function notEllieo() {
  return BRAND === 'ellieo' ? null : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function signedInUid() {
  return (await resolveAuthenticatedUser())?.uid ?? null
}

export function loginRequired() {
  return NextResponse.json({ error: 'Log in to continue.', code: 'LOGIN_REQUIRED' }, { status: 401 })
}

export function errorResponse(error: unknown, where: string) {
  if (error instanceof ListingError || error instanceof MessagingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error(`Ellieo ${where} error:`, error)
  return NextResponse.json({ error: 'Something went wrong. Try again.', code: 'SERVER_ERROR' }, { status: 500 })
}

/** JSON body or {} (a bad body is treated as empty; the handlers validate fields). */
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
