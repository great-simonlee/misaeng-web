import { NextResponse } from 'next/server'

import { incrementStoredCommunityViewCount } from '@lib/supabase/community.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const post = await incrementStoredCommunityViewCount(id)
    if (!post) {
      return NextResponse.json(
        { viewCount: 0, error: 'Not found' },
        { status: 404 },
      )
    }
    return NextResponse.json({ viewCount: post.viewCount })
  } catch (error) {
    console.error('Community view increment error:', error)
    return NextResponse.json(
      { viewCount: 0, error: 'Failed to record view.' },
      { status: 500 },
    )
  }
}
