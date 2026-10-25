'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'

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
import { useT } from '@lib/i18n/client'
import { cn } from '@lib'

type ReferralPayload = {
  code: string
  shareUrl: string
  referredByCode: string | null
  usedCount: number
  maxUses: number
}

/** `{name}` 자리에 요소를 끼운다 (언어마다 어순이 달라서 문장을 쪼개지 않는다) */
function renderWithSlots(template: string, slots: Record<string, ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const name = part.match(/^\{(\w+)\}$/)?.[1]
    if (name && name in slots) return <Fragment key={index}>{slots[name]}</Fragment>
    return part
  })
}

export function MyPageReferralSection() {
  const t = useT('me')
  const tCredit = useT('credit')
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
      success(t('referral.linkCopied'))
    } catch {
      toastError(t('referral.copyFailed'))
    } finally {
      setCopying(false)
    }
  }

  async function handleBind() {
    const code = normalizeReferralCode(referrerDraft)
    if (!isValidReferralCode(code)) {
      toastError(t('referral.errors.invalidCode'))
      return
    }
    if (data?.code && code === data.code) {
      toastError(t('referral.errors.ownCode'))
      return
    }
    setSaving(true)
    try {
      const bound = await bindReferralCodeRequest(
        code,
        tCredit('referral.bindFailed'),
      )
      clearPersistedReferralCode()
      setData((prev) =>
        prev
          ? { ...prev, referredByCode: bound?.referredByCode ?? code }
          : prev,
      )
      success(t('referral.bound'))
    } catch (err) {
      toastError(getErrorMessage(err, tCredit('referral.bindFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className='mb-3 px-0.5 text-[13px] font-semibold tracking-tight text-[var(--foreground)]'>
        {t('referral.title')}
      </h3>
      <div className='overflow-hidden rounded-[1.25rem] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]'>
        <div className='px-5 py-4'>
          <p className='text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            {renderWithSlots(
              t('referral.description', { max: COMMUNITY_CREDIT_REFERRAL_MAX }),
              {
                credits: (
                  <span className='font-semibold text-[var(--foreground)]'>
                    {t('referral.creditsAmount', {
                      count: COMMUNITY_CREDIT_REFERRAL_POST,
                    })}
                  </span>
                ),
              },
            )}
          </p>

          <button
            type='button'
            onClick={() => void handleCopy()}
            disabled={loading || copying || !data?.shareUrl}
            className='mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-40'
          >
            {copying ? t('referral.copying') : t('referral.shareButton')}
          </button>

          <div className='mt-4 rounded-xl bg-[#f4f5f7] px-3.5 py-3'>
            <p className='text-[11px] font-medium text-[var(--muted)]'>
              {t('referral.myCode')}
            </p>
            <p className='mt-1 font-mono text-[16px] font-semibold tracking-[0.14em] text-[var(--foreground)]'>
              {loading ? t('referral.loading') : data?.code || '—'}
            </p>
            <p className='mt-1 text-[12px] text-[var(--muted)]'>
              {t('referral.usedCount', {
                used: data?.usedCount ?? 0,
                max: data?.maxUses ?? COMMUNITY_CREDIT_REFERRAL_MAX,
              })}
            </p>
          </div>
        </div>

        <div className='border-t border-[#f0f1f3] px-5 py-4'>
          <p className='text-[12px] font-medium text-[var(--muted)]'>
            {t('referral.enterReferrer')}
          </p>
          {data?.referredByCode ? (
            <p className='mt-2 text-[14px] font-medium text-[var(--foreground)]'>
              {renderWithSlots(t('referral.boundTo'), {
                code: (
                  <span className='font-mono tracking-[0.08em]'>
                    {data.referredByCode}
                  </span>
                ),
              })}
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
                placeholder={t('referral.codePlaceholder')}
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
                {saving ? t('referral.binding') : t('referral.bind')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
