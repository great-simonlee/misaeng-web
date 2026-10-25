import { NextResponse } from 'next/server'

import { getRequestT } from '@lib/i18n/server'

import { refreshEllieoAccessToken } from '../lib/ellieoServer'

export async function POST(request: Request) {
  const accessToken = await refreshEllieoAccessToken()
  if (!accessToken) {
    const t = await getRequestT(request, 'api')
    return NextResponse.json(
      { error: t('auth.sessionExpired') },
      { status: 401 },
    )
  }

  return NextResponse.json({ connected: true })
}
