'use client'

import { useEffect, useState } from 'react'

import { AppHandoffButton } from '@components/AppHandoff'
import { BRAND_CONFIG } from '@lib/brand'
import { useT } from '@lib/i18n/client'

/**
 * 면접·취업 후기 상세: "커피챗 신청"(글쓴이가 멘토일 때만, 앱과 같은 확인) · "선배에게 질문하기".
 * 둘 다 앱에서만 하는 일이라 누르면 앱 연결 시트(같은 후기 화면으로) — 웹에서는 댓글만 바로 쓴다.
 * 포인트 설정에서 꺼져 있으면 버튼도 없다.
 */
export function ReviewAppActions({ postId }: { postId: string }) {
  const t = useT('common')
  const [askEnabled, setAskEnabled] = useState(false)
  const [mentor, setMentor] = useState(false)

  useEffect(() => {
    if (BRAND_CONFIG.id !== 'misaeng') return
    let alive = true
    void (async () => {
      const config = await fetch('/api/points/config', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
      if (!alive || !config) return
      setAskEnabled(config.reviewQna?.enabled === true)
      if (config.coffeeChat?.enabled !== true) return
      const found = await fetch(`/api/app/coffee-chat/mentors/by-post?postId=${encodeURIComponent(postId)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
      if (alive) setMentor(Boolean(found?.coffeeChat))
    })()
    return () => {
      alive = false
    }
  }, [postId])

  if (!askEnabled && !mentor) return null
  const appPath = `review/${postId}`
  return (
    <div className='mt-6 flex flex-wrap gap-2'>
      {mentor ? (
        <AppHandoffButton appPath={appPath} action='coffeeChat' variant='primary' label={t('appHandoff.buttons.coffeeChat')} />
      ) : null}
      {askEnabled ? <AppHandoffButton appPath={appPath} action='ask' label={t('appHandoff.buttons.ask')} /> : null}
    </div>
  )
}
