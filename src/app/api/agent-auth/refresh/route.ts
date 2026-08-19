import { NextResponse } from 'next/server'

import { refreshEllieoAccessToken } from '../lib/ellieoServer'

export async function POST() {
  const accessToken = await refreshEllieoAccessToken()
  if (!accessToken) {
    return NextResponse.json(
      { error: '세션이 만료되었어요. 다시 로그인해 주세요.' },
      { status: 401 },
    )
  }

  return NextResponse.json({ connected: true })
}
