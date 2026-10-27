import { NextResponse } from 'next/server'

import { getSchoolRegistry } from '@lib/supabase/schoolRegistry.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verified schools (managed in the ERP: Misaeng → Schools), for the web client and the app.
 * GET → 200 { schools: [{ id, shortName, fullName, domains, enabled }] }
 * Disabled schools stay in the list (enabled: false, no domains) so old badges still show a name;
 * they are not offered in filters and cannot be verified anymore.
 * Domains are school email domains (public anyway) — the clients use them for the "is this a school email" hint.
 */
export async function GET() {
  const registry = await getSchoolRegistry()
  const schools = registry.map((school) => ({
    id: school.id,
    shortName: school.shortName,
    fullName: school.fullName,
    domains: school.enabled ? school.domains : [],
    enabled: school.enabled,
  }))
  return NextResponse.json(
    { schools },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } },
  )
}
