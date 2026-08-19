import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '../lib/authHelpers'
import { getSupabaseAvatarBucket } from '@lib/supabase/server'
import {
  isSupabaseStorageConfigured,
  uploadAvatarToSupabase,
} from '@lib/supabase/avatar.server'
import { upsertSupabaseProfile } from '@lib/supabase/profile.server'

export async function POST(request: Request) {
  try {
    if (!isSupabaseStorageConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase 스토리지 설정이 필요해요. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요.',
        },
        { status: 503 },
      )
    }

    const currentUser = await resolveAuthenticatedUser()
    if (!currentUser?.uid) {
      return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { photoURL?: string }
      const photoURL = body.photoURL?.trim()
      if (!photoURL) {
        return NextResponse.json(
          { error: 'photoURL이 필요해요.' },
          { status: 400 },
        )
      }

      await upsertSupabaseProfile(currentUser.uid, {
        email: currentUser.email,
        photoURL,
      }).catch(() => null)

      return NextResponse.json({
        ok: true,
        photoURL,
      })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '업로드할 파일이 필요해요.' },
        { status: 400 },
      )
    }

    const bucket = getSupabaseAvatarBucket()
    const photoURL = await uploadAvatarToSupabase({
      uid: currentUser.uid,
      file,
      bucket,
    })

    await upsertSupabaseProfile(currentUser.uid, {
      email: currentUser.email,
      photoURL,
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      photoURL,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '프로필 이미지 업로드 중 오류가 발생했어요.',
      },
      { status: 500 },
    )
  }
}
