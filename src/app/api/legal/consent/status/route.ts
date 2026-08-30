import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { getConsentStatus } from '@lib/supabase/legalConsent.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const status = await getConsentStatus(user.uid)
  return NextResponse.json(status)
}
