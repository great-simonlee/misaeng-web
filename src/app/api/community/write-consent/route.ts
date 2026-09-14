import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import {
  ANONYMOUS_WRITING_GUIDELINES,
  COMMUNITY_WRITING_GUIDELINES,
  WRITE_GUIDELINES_VERSION,
} from '@lib/constants/communityGuidelines'
import { getClientIp, getClientUserAgent } from '@lib/consent/requestMeta'
import {
  appendWriteConsentLog,
  getWriteConsentStatus,
  isLegalConsentStorageConfigured,
  normalizeWriteConsentSource,
} from '@lib/supabase/legalConsent.server'
import { upsertSupabaseProfile } from '@lib/supabase/profile.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseSource(value: unknown) {
  return normalizeWriteConsentSource(value)
}

export async function GET() {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }
  const status = await getWriteConsentStatus(user.uid, WRITE_GUIDELINES_VERSION)
  return NextResponse.json(status)
}

export async function POST(request: Request) {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const source = parseSource(body?.source)

  if (!isLegalConsentStorageConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      version: WRITE_GUIDELINES_VERSION,
    })
  }

  const log = await appendWriteConsentLog({
    userId: user.uid,
    email: user.email,
    guidelinesVersion: WRITE_GUIDELINES_VERSION,
    guidelines:
      source === 'anonymous'
        ? [...COMMUNITY_WRITING_GUIDELINES, ...ANONYMOUS_WRITING_GUIDELINES]
        : COMMUNITY_WRITING_GUIDELINES,
    source,
    ipAddress: getClientIp(request),
    userAgent: getClientUserAgent(request),
  })

  await upsertSupabaseProfile(user.uid, {
    email: user.email,
    writeGuidelinesVersion: log.guidelines_version,
    writeGuidelinesConsentedAt: log.consented_at,
    writeGuidelinesSource: log.source,
  }).catch(() => null)

  return NextResponse.json({ ok: true, log })
}
