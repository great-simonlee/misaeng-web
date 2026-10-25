import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'
import { getActiveCompanyBySlug } from '@lib/supabase/companies.server'
import { isFollowingCompany, PushStoreError, setCompanyFollow } from '@lib/push/store.server'
import { resolveAuthenticatedUser } from '../../../agent-auth/lib/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ slug: string }> }

async function resolve(request: Request, context: Context) {
  const t = await getRequestT(request, 'api')
  const user = await resolveAuthenticatedUser()
  if (!user?.uid) return { error: NextResponse.json({ error: t('common.loginRequired') }, { status: 401 }) }
  const { slug } = await context.params
  const company = await getActiveCompanyBySlug(slug)
  if (!company) return { error: NextResponse.json({ error: t('common.requestFailed') }, { status: 404 }) }
  return { uid: user.uid, companyId: company.id, t }
}

/** GET → { following } */
export async function GET(request: Request, context: Context) {
  const r = await resolve(request, context)
  if ('error' in r) return r.error
  return NextResponse.json({ following: await isFollowingCompany(r.uid, r.companyId) })
}

/** POST follow / DELETE unfollow → { following }. Followers get a push when the company has a new posting. */
async function set(request: Request, context: Context, follow: boolean) {
  const r = await resolve(request, context)
  if ('error' in r) return r.error
  try {
    await setCompanyFollow(r.uid, r.companyId, follow)
    return NextResponse.json({ following: follow })
  } catch (error) {
    const setup = error instanceof PushStoreError && error.setupRequired
    return NextResponse.json({ error: setup ? error.message : r.t('common.requestFailed') }, { status: setup ? 503 : 500 })
  }
}

export const POST = (request: Request, context: Context) => set(request, context, true)
export const DELETE = (request: Request, context: Context) => set(request, context, false)
