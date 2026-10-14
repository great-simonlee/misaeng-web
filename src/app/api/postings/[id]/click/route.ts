import { NextResponse } from 'next/server'
import { resolveAuthenticatedUser } from '@/app/api/agent-auth/lib/authHelpers'
import { recordPostingClick } from '@lib/supabase/jobPostings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** POST /api/postings/{id}/click — "공고 원문 보기" 클릭 기록 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await resolveAuthenticatedUser().catch(() => null)
    const ok = await recordPostingClick({ postingId: String(id || '').trim(), userId: user?.uid ?? null })
    return NextResponse.json({ ok })
  } catch (error) {
    console.error('Posting click error:', error)
    // 클릭 기록 실패가 링크 이동을 막지 않도록 200
    return NextResponse.json({ ok: false })
  }
}
