'use client'

import { useCallback, useEffect, useState } from 'react'

import { LoadingSpinner } from '@components'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  fetchBlockedUsers,
  unblockUserRequest,
  type BlockedUser,
} from '@lib/community/blocks.client'
import { localizeCommunityError } from '@lib/community/client'
import { useFormat, useT } from '@lib/i18n/client'

/** 마이페이지 "차단한 사용자" — 목록과 차단 해제 */
export function MyPageBlockedUsersSection() {
  const t = useT('community')
  const tCommon = useT('common')
  const fmt = useFormat()
  const { error: toastError, success } = useToast()
  const [blocks, setBlocks] = useState<BlockedUser[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setBlocks(await fetchBlockedUsers())
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUnblock(id: string) {
    if (unblockingId) return
    setUnblockingId(id)
    try {
      setBlocks(await unblockUserRequest(id))
      success(t('blocks.unblocked'))
    } catch (err) {
      toastError(getErrorMessage(localizeCommunityError(err, t), t('blocks.unblockFailed')))
    } finally {
      setUnblockingId(null)
    }
  }

  return (
    <section>
      <h3 className='mb-1 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('blocks.listTitle')}
      </h3>
      <p className='mb-3 px-0.5 text-[12px] text-[var(--muted)]'>{t('blocks.listHint')}</p>
      <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        {blocks === null && !failed ? (
          <div className='flex justify-center px-5 py-6'>
            <LoadingSpinner size='sm' aria-label={t('blocks.loading')} />
          </div>
        ) : failed ? (
          <div className='flex items-center justify-between gap-3 px-5 py-4'>
            <p className='text-[13px] text-[var(--muted)]'>{t('blocks.loadFailed')}</p>
            <button
              type='button'
              onClick={() => {
                setBlocks(null)
                void load()
              }}
              className='shrink-0 text-[13px] font-semibold text-[var(--brand)] touch-manipulation'
            >
              {tCommon('actions.retry')}
            </button>
          </div>
        ) : blocks && blocks.length === 0 ? (
          <p className='px-5 py-4 text-[13px] text-[var(--muted)]'>{t('blocks.empty')}</p>
        ) : (
          <ul className='divide-y divide-black/[0.05]'>
            {(blocks ?? []).map((item) => (
              <li key={item.id} className='flex items-center gap-3 px-5 py-3.5'>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]'>
                    {item.anonymous || !item.label ? t('blocks.anonymousUser') : item.label}
                  </p>
                  {item.createdAt ? (
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                      {t('blocks.blockedAt', {
                        date: fmt.date(item.createdAt, { year: 'numeric', month: 'short', day: 'numeric' }),
                      })}
                    </p>
                  ) : null}
                </div>
                <button
                  type='button'
                  onClick={() => void handleUnblock(item.id)}
                  disabled={unblockingId === item.id}
                  className='shrink-0 rounded-full bg-[#f4f5f7] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation transition hover:bg-[#eef0f3] disabled:opacity-50'
                >
                  {t('blocks.unblock')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
