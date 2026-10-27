'use client'

import { useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { blockAuthorRequest } from '@lib/community/blocks.client'
import { localizeCommunityError } from '@lib/community/client'
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'

type CommunityBlockActionProps = {
  postId: string
  /** 댓글 작성자를 차단할 때 */
  commentId?: string | null
  /** 차단 후 (목록·글 다시 불러오기) */
  onBlocked?: () => void
  className?: string
}

/** "차단하기" — 글·댓글 작성자를 차단한다. 작성자는 서버가 찾으므로 익명 작성자도 차단할 수 있다 */
export function CommunityBlockAction({
  postId,
  commentId,
  onBlocked,
  className,
}: CommunityBlockActionProps) {
  const t = useT('community')
  const { user, loading: authLoading } = useAuth()
  const { error: toastError, success } = useToast()
  const [blocking, setBlocking] = useState(false)

  if (authLoading || !user) return null

  async function handleBlock() {
    if (blocking) return
    if (!window.confirm(t('blocks.confirm'))) return
    setBlocking(true)
    try {
      await blockAuthorRequest({ postId, commentId })
      success(t('blocks.blocked'))
      onBlocked?.()
    } catch (err) {
      toastError(getErrorMessage(localizeCommunityError(err, t), t('blocks.failed')))
    } finally {
      setBlocking(false)
    }
  }

  return (
    <button
      type='button'
      onClick={() => void handleBlock()}
      disabled={blocking}
      className={cn(
        'shrink-0 text-[13px] font-medium text-[var(--muted)] touch-manipulation transition hover:text-red-600 disabled:opacity-50',
        className,
      )}
    >
      {t('blocks.action')}
    </button>
  )
}
