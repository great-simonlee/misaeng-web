import { NextResponse } from 'next/server'

import { getEllieoBaseUrl } from '../lib/ellieoServer'
import { loginOrRegisterWithGoogle } from '../lib/authHelpers'

type GoogleAuthBody = {
  idToken?: string
  googleIdToken?: string
  token?: string
  credential?: string
  email?: string | null
  name?: string | null
}

export async function POST(request: Request) {
  try {
    if (!getEllieoBaseUrl()) {
      return NextResponse.json(
        {
          error:
            'APP_CONNECT_API_BASE_URL 환경 변수가 없어 로그인을 연결할 수 없어요.',
        },
        { status: 503 },
      )
    }

    const body = (await request.json()) as GoogleAuthBody
    const idToken =
      body.idToken ?? body.googleIdToken ?? body.token ?? body.credential

    if (!idToken) {
      return NextResponse.json(
        { error: 'Google idToken이 필요해요.' },
        { status: 400 },
      )
    }

    const result = await loginOrRegisterWithGoogle(
      idToken,
      body.email,
      body.name,
    )

    if (!result.ok) {
      const status =
        'status' in result && result.status && result.status >= 500
          ? 503
          : 401

      return NextResponse.json(
        {
          error: result.error,
          ...(status === 401
            ? {
                hint: 'Google 계정이 Ellieo에 등록되어 있지 않을 수 있어요. 이메일 회원가입을 먼저 시도해 보세요.',
              }
            : {}),
        },
        { status },
      )
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      registered: result.registered,
      user: result.user,
    })
  } catch (error) {
    console.error('Google auth error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Google 인증 중 오류가 발생했어요.',
      },
      { status: 500 },
    )
  }
}
