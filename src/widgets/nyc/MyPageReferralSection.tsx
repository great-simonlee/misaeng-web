'use client'

import { useEffect, useState } from 'react'

import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  bindReferralCodeRequest,
  captureReferralFromLocation,
  clearPersistedReferralCode,
  isValidReferralCode,
  normalizeReferralCode,
  readPersistedReferralCode,
} from '@lib/community/referral'
import {
  COMMUNITY_CREDIT_REFERRAL_MAX,
  COMMUNITY_CREDIT_REFERRAL_POST,
} from '@lib/constants/communityCredit'
import { cn } from '@lib'

type ReferralPayload = {
  code: string
  shareUrl: string
  referredByCode: string | null
  usedCount: number
  maxUses: number
}

export function MyPageReferralSection() {
  const { success, error: toastError } = useToast()
  const [data, setData] = useState<ReferralPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [referrerDraft, setReferrerDraft] = useState('')

  useEffect(() => {
    captureReferralFromLocation()
    const pending = readPersistedReferralCode()
    if (pending) setReferrerDraft(pending)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/community/referral', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((payload: ReferralPayload & { error?: string }) => {
        if (cancelled) return
        if (payload?.code) {
          setData({
            code: payload.code,
            shareUrl: payload.shareUrl,
            referredByCode: payload.referredByCode ?? null,
            usedCount: payload.usedCount ?? 0,
            maxUses: payload.maxUses ?? COMMUNITY_CREDIT_REFERRAL_MAX,
          })
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCopy() {
    if (!data?.shareUrl) return
    setCopying(true)
    try {
      await navigator.clipboard.writeText(data.shareUrl)
      success('추천 링크를 복사했어요')
    } catch {
      toastError('링크 복사에 실패했어요. 코드를 직접 전달해 주세요.')
    } finally {
      setCopying(false)
    }
  }

  async function handleBind() {
    const code = normalizeReferralCode(referrerDraft)
    if (!isValidReferralCode(code)) {
      toastError('추천인 코드 8자리를 입력해 주세요')
      return
    }
    if (data?.code && code === data.code) {
      toastError('본인 코드로는 추천할 수 없어요')
      return
    }
    setSaving(true)
    try {
      const bound = await bindReferralCodeRequest(code)
      clearPersistedReferralCode()
      setData((prev) =>
        prev
          ? { ...prev, referredByCode: bound?.referredByCode ?? code }
          : prev,
      )
      success('추천인을 연결했어요')
    } catch (err) {
      toastError(getErrorMessage(err, '추천인 연결에 실패했어요'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        추천
      </h3>
      <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        <div className='px-5 py-4'>
          <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            다른 사람이 내 추천 코드를 사용할 때마다 내가{' '}
            <span className='font-semibold text-[var(--foreground)]'>
              {COMMUNITY_CREDIT_REFERRAL_POST} 크레딧
            </span>
            을 받아요. 최대 {COMMUNITY_CREDIT_REFERRAL_MAX}명까지, 본인 추천은
            안 돼요.
          </p>

          <button
            type='button'
            onClick={() => void handleCopy()}
            disabled={loading || copying || !data?.shareUrl}
            className='mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-40'
          >
            {copying ? '복사 중…' : '선후배 친구들에게 추천하기'}
          </button>

          <div className='mt-4 rounded-xl bg-[#f4f5f7] px-3.5 py-3'>
            <p className='text-[11px] font-medium text-[var(--muted)]'>
              내 추천 코드
            </p>
            <p className='mt-1 font-mono text-[16px] font-semibold tracking-[0.14em] text-[var(--foreground)]'>
              {loading ? '불러오는 중…' : data?.code || '—'}
            </p>
            <p className='mt-1 text-[12px] text-[var(--muted)]'>
              사용한 사람 {data?.usedCount ?? 0}/
              {data?.maxUses ?? COMMUNITY_CREDIT_REFERRAL_MAX}명
            </p>
          </div>
        </div>

        <div className='border-t border-[#f0f1f3] px-5 py-4'>
          <p className='text-[12px] font-medium text-[var(--muted)]'>
            추천인 입력하기
          </p>
          {data?.referredByCode ? (
            <p className='mt-2 text-[14px] font-medium text-[var(--foreground)]'>
              추천인 코드{' '}
              <span className='font-mono tracking-[0.08em]'>
                {data.referredByCode}
              </span>
              와 연결됐어요.
            </p>
          ) : (
            <div className='mt-2 flex gap-2'>
              <input
                type='text'
                value={referrerDraft}
                onChange={(e) =>
                  setReferrerDraft(normalizeReferralCode(e.target.value))
                }
                maxLength={8}
                placeholder='추천인 코드 8자리'
                autoCapitalize='characters'
                autoCorrect='off'
                spellCheck={false}
                className='h-11 min-w-0 flex-1 rounded-xl bg-[#f4f5f7] px-3.5 font-mono text-[14px] tracking-[0.12em] text-[var(--foreground)] outline-none ring-1 ring-transparent transition placeholder:font-sans placeholder:tracking-normal placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30'
              />
              <button
                type='button'
                onClick={() => void handleBind()}
                disabled={saving || !isValidReferralCode(referrerDraft)}
                className={cn(
                  'h-11 shrink-0 rounded-full bg-[var(--brand)] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-40',
                )}
              >
                {saving ? '연결 중…' : '연결'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
