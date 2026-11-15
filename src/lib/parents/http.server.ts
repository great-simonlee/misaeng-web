import { NextResponse } from 'next/server'

import { BRAND_CONFIG } from '@lib/brand'
import type { Translate } from '@lib/i18n/translate'

import { ParentInviteError } from './parentInvites.server'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export function parentJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

/** `t` = api namespace. Codes: src/lib/parents/parentInvites.server.ts (ParentInviteError) */
export function parentErrorResponse(t: Translate, error: unknown) {
  if (error instanceof ParentInviteError) {
    return parentJson({ error: t(error.key, error.params), code: error.code, ...(error.params ?? {}) }, error.status)
  }
  console.error('Parent invite API error:', error)
  return parentJson({ error: t('parents.failed'), code: 'PARENT_INVITE_ERROR' }, 500)
}

/** 공유 링크는 공개 사이트 주소로 (AWS 프록시 뒤에서는 request.url이 내부 주소) */
export function publicOrigin(request: Request) {
  return process.env.NODE_ENV === 'production' ? BRAND_CONFIG.siteUrl : new URL(request.url).origin
}
