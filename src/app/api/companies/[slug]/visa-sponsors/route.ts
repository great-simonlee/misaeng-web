import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'
import { hasPremiumAccess } from '@lib/premium/access.server'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { getVisaSponsorData } from '@lib/supabase/visaSponsors.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/companies/{slug}/visa-sponsors — H-1B (LCA) / green card (PERM) filing history from U.S. Department of
 * Labor OFLC public data. Everyone gets `summary` (has the company filed in the loaded years) and `source`;
 * `years` / `roles` only for Premium (`locked: false`), otherwise null. 404 until the data is loaded.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params
  const company = await getActiveCompanyBySlug(slug)
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  const data = await getVisaSponsorData(company.id)
  if (!data) return NextResponse.json({ error: 'Visa sponsor data is not loaded yet' }, { status: 404 })

  const user = await resolveAuthenticatedUser().catch(() => null)
  const unlocked = await hasPremiumAccess(user)
  return NextResponse.json({
    summary: {
      h1b: data.years.some((y) => y.h1b > 0),
      greenCard: data.years.some((y) => y.greenCard > 0),
    },
    locked: !unlocked,
    years: unlocked ? data.years : null,
    roles: unlocked ? data.roles : null,
    source: data.source,
  })
}
