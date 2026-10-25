'use client'

import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

import { useCityPath } from '@hooks/useCity'
import { useT } from '@lib/i18n/client'

const CODE_CLASS = 'break-all font-mono text-[11px] sm:text-xs'

/** 문구 안 `{name}` 자리에 노드를 끼워 넣는다 */
function withNodes(template: string, nodes: Record<string, ReactNode>) {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1]
    return name && name in nodes ? (
      <Fragment key={i}>{nodes[name]}</Fragment>
    ) : (
      part
    )
  })
}

interface AuthConfigBannerProps {
  className?: string
}

/** 로컬 개발용 — Production(Vercel)에서는 표시하지 않음 */
export function AuthConfigBanner({ className }: AuthConfigBannerProps) {
  const href = useCityPath()
  const t = useT('common')
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div
      className={
        className ??
        'rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900 sm:px-4 sm:text-sm'
      }
    >
      {withNodes(t('ui.authConfigBanner.body'), {
        baseUrl: <code className={CODE_CLASS}>APP_CONNECT_API_BASE_URL</code>,
        clientId: (
          <code className={CODE_CLASS}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
        ),
        endpoint: <code className={CODE_CLASS}>auth/login/google</code>,
        envExample: <code className={CODE_CLASS}>.env.example</code>,
      })}{' '}
      <Link
        href={href('/login')}
        className='font-semibold underline-offset-2 hover:underline'
      >
        {t('ui.configBanner.loginPage')}
      </Link>
    </div>
  )
}
