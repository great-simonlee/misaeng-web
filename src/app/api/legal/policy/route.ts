import { NextResponse } from 'next/server'

import { getLegalPolicy } from '@lib/supabase/legalConsent.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const policy = await getLegalPolicy()
  return NextResponse.json({ policy })
}
