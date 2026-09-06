import { NextResponse } from 'next/server'

import { getAboutTeamMembers } from '@lib/supabase/aboutTeam.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const members = await getAboutTeamMembers()
  return NextResponse.json({ members })
}
