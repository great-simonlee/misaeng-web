'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@hooks/useAuth'
import { useCity } from '@hooks/useCity'
import { getErrorMessage, useToast } from '@hooks/useToast'
import { cn } from '@lib'
import { useFormat, useT } from '@lib/i18n/client'

type InviteState = 'waiting' | 'scheduled' | 'paid' | 'forfeited' | 'expired' | 'revoked'

type Invite = {
  code: string
  url: string
  state: InviteState
  parentNickname: string | null
  expiresAt: string
  rewardDueAt: string | null
  rewardAmount: number
}

type Summary = {
  eligible: boolean
  reason: 'not_verified' | 'parent' | 'suspended' | null
  max: number
  remaining: number
  rewardPoints: number
  delayDays: number
  invites: Invite[]
}

/**
 * 마이페이지 "부모님 초대하고 30P 받기 · 최대 2명" (1.0.7, 미생만). 인증한 학생만 링크를 만든다.
 * 초대마다 상태: 가입 대기 / 3일 후 지급 예정 / 지급 완료. 링크 복사 + 카카오톡에 붙일 문구 복사.
 * 테이블이 없으면(SQL 전) 카드를 숨긴다.
 */
export function MyPageParentInviteSection() {
  const t = useT('me.parentInvite')
  const format = useFormat()
  const city = useCity()
  const { nickname } = useAuth()
  const { success, error: toastError } = useToast()
  const [data, setData] = useState<Summary | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/parent-invites', { credentials: 'include', cache: 'no-store' }).catch(() => null)
    const payload = (await res?.json().catch(() => null)) as (Summary & { error?: string }) | null
    setData(res?.ok && payload ? payload : null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!data || data.reason === 'parent') return null

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/parent-invites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      })
      const payload = (await res.json().catch(() => null)) as { error?: string; invite?: Invite } | null
      if (!res.ok || !payload?.invite) throw new Error(payload?.error || t('createFailed'))
      await load()
      await copy(payload.invite.url, t('linkCopied'))
    } catch (err) {
      toastError(getErrorMessage(err, t('createFailed')))
    } finally {
      setCreating(false)
    }
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text)
      success(message)
    } catch {
      toastError(t('copyFailed'))
    }
  }

  // 카카오톡에 붙일 문구: "○○이(가) 미생에 초대했어요. …" + 링크 (링크 미리보기는 share-parent.png)
  const shareText = (invite: Invite) => `${t('kakaoText', { name: nickname?.trim() || t('me') })}\n${invite.url}`
  const open = data.invites.filter((i) => i.state === 'waiting')
  const others = data.invites.filter((i) => i.state !== 'waiting' && i.state !== 'expired' && i.state !== 'revoked')

  return (
    <section id='parent-invite' className='scroll-mt-24'>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('title', { amount: data.rewardPoints, max: data.max })}
      </h3>
      <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        <div className='px-5 py-4'>
          <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {t('description', { amount: data.rewardPoints, days: data.delayDays, max: data.max })}
          </p>

          {!data.eligible ? (
            <p className='mt-3 rounded-xl bg-[#f4f5f7] px-3.5 py-3 text-[12.5px] text-[var(--muted-foreground)]'>
              {t('verifyFirst')}
            </p>
          ) : data.remaining > 0 ? (
            <button
              type='button'
              onClick={() => void create()}
              disabled={creating}
              className='mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-40'
            >
              {creating ? t('creating') : t('createButton')}
            </button>
          ) : (
            <p className='mt-3 text-[12.5px] text-[var(--muted)]'>{t('limitReached', { max: data.max })}</p>
          )}
        </div>

        {open.length + others.length > 0 ? (
          <ul className='border-t border-[#f0f1f3]'>
            {[...open, ...others].map((invite, index, list) => (
              <li
                key={invite.code}
                className={cn('px-5 py-3.5', index !== list.length - 1 && 'border-b border-[#f0f1f3]')}
              >
                <div className='flex items-center gap-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[14px] font-medium text-[var(--foreground)]'>
                      {invite.parentNickname || t('parentFallback')}
                    </p>
                    <p className='mt-0.5 text-[12px] text-[var(--muted)]'>
                      {invite.state === 'waiting'
                        ? t('state.waiting', { date: format.date(invite.expiresAt) })
                        : invite.state === 'scheduled'
                          ? t('state.scheduled', {
                              amount: invite.rewardAmount,
                              date: invite.rewardDueAt ? format.date(invite.rewardDueAt) : '',
                            })
                          : invite.state === 'paid'
                            ? t('state.paid', { amount: invite.rewardAmount })
                            : t('state.forfeited')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      invite.state === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : invite.state === 'scheduled'
                          ? 'bg-amber-50 text-amber-800'
                          : invite.state === 'waiting'
                            ? 'bg-[#f4f5f7] text-[var(--muted-foreground)]'
                            : 'bg-[#f4f5f7] text-[var(--muted)]',
                    )}
                  >
                    {t(`badge.${invite.state === 'expired' || invite.state === 'revoked' ? 'forfeited' : invite.state}`)}
                  </span>
                </div>
                {invite.state === 'waiting' ? (
                  <div className='mt-2.5 flex gap-2'>
                    <button
                      type='button'
                      onClick={() => void copy(invite.url, t('linkCopied'))}
                      className='h-9 flex-1 rounded-full bg-[#f4f5f7] text-[12.5px] font-semibold text-[var(--foreground)] touch-manipulation'
                    >
                      {t('copyLink')}
                    </button>
                    <button
                      type='button'
                      onClick={() => void copy(shareText(invite), t('kakaoCopied'))}
                      className='h-9 flex-1 rounded-full bg-[#FEE500] text-[12.5px] font-semibold text-[#191919] touch-manipulation'
                    >
                      {t('copyKakao')}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <p className='border-t border-[#f0f1f3] px-5 py-3 text-[11.5px] leading-relaxed text-[var(--muted)]'>
          {t('fairUse')}
        </p>
      </div>
    </section>
  )
}
