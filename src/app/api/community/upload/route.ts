import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../../agent-auth/lib/authHelpers'
import {
  isCommunityImageStorageConfigured,
  uploadCommunityImageToSupabase,
} from '@lib/supabase/communityImages.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!isCommunityImageStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
          code: 'STORAGE_UNAVAILABLE',
        },
        { status: 503 },
      )
    }

    const user = await resolveAuthenticatedUser()
    if (!user?.uid) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '업로드할 파일이 필요해요.' },
        { status: 400 },
      )
    }

    const url = await uploadCommunityImageToSupabase({
      uid: user.uid,
      file,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Community image upload error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '이미지 업로드에 실패했어요.',
      },
      { status: 500 },
    )
  }
}
