import { NextResponse } from 'next/server'

import { ellieoAuthorizedFetch } from '../lib/ellieoServer'
import {
  getSupabaseAvatarBucket,
  getSupabaseServiceClient,
} from '@lib/supabase/server'

function extractCurrentUser(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const data =
    'data' in payload && payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload

  if (!data || typeof data !== 'object') return null

  const email =
    ('email' in data && typeof data.email === 'string' && data.email) ||
    ('userEmail' in data && typeof data.userEmail === 'string' && data.userEmail) ||
    null
  const uid =
    ('id' in data && data.id != null && String(data.id)) ||
    ('uid' in data && data.uid != null && String(data.uid)) ||
    ('userIdx' in data && data.userIdx != null && String(data.userIdx)) ||
    email

  if (!email || !uid) return null

  return { uid, email }
}

export async function POST(request: Request) {
  try {
    const me = await ellieoAuthorizedFetch('user/profile', { method: 'GET' })
    if (!me.res.ok) {
      return NextResponse.json(
        { error: '로그인이 필요해요.' },
        { status: 401 },
      )
    }

    const currentUser = extractCurrentUser(me.data)
    if (!currentUser) {
      return NextResponse.json(
        { error: '사용자 정보를 확인할 수 없어요.' },
        { status: 401 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '업로드할 파일이 필요해요.' },
        { status: 400 },
      )
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
    const filePath = `${currentUser.uid}/${Date.now()}.${ext}`
    const bucket = getSupabaseAvatarBucket()
    const supabase = getSupabaseServiceClient()

    const uploadResult = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      })

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `스토리지 업로드 실패: ${uploadResult.error.message}` },
        { status: 500 },
      )
    }

    const publicUrlResult = supabase.storage.from(bucket).getPublicUrl(filePath)
    const photoURL = publicUrlResult.data.publicUrl

    await ellieoAuthorizedFetch('user/profile', {
      method: 'PUT',
      body: {
        photoURL,
        profileImage: photoURL,
      },
    })

    return NextResponse.json({
      ok: true,
      photoURL,
      path: filePath,
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
