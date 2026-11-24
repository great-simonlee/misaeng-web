import { NextResponse } from 'next/server'

import type { Translate } from '@lib/i18n/translate'

import { FamilyError } from './store.server'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export function familyJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

/** `t` = api namespace. Errors: { error (localized), code, ...params }. Codes: src/lib/family/*.server.ts */
export function familyErrorResponse(t: Translate, error: unknown) {
  if (error instanceof FamilyError) {
    return familyJson({ error: t(error.key, error.params), code: error.code, ...(error.params ?? {}) }, error.status)
  }
  // ParentInviteError-like (shared keys) and everything else
  console.error('Family API error:', error)
  return familyJson({ error: t('family.failed'), code: 'FAMILY_ERROR' }, 500)
}
