import { NextResponse } from 'next/server'

import { BRAND } from '@lib/brand'
import { ListingError } from '@lib/ellieo/listings.server'

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
  if (error instanceof ListingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error(`Ellieo ${where} error:`, error)
  return NextResponse.json({ error: 'Something went wrong. Try again.', code: 'SERVER_ERROR' }, { status: 500 })
}
