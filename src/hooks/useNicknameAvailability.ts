'use client'

import { useEffect, useState } from 'react'

import { useT } from '@lib/i18n/client'

export type NicknameAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error'

export type NicknameAvailability = {
  status: NicknameAvailabilityStatus
  message: string | null
}

type UseNicknameAvailabilityOptions = {
  /** 이미 내 닉네임이면 확인하지 않는다 (대소문자 무시) */
  currentNickname?: string | null
  /** false면 확인하지 않는다 (형식 오류·시트 닫힘 등) */
  enabled?: boolean
  /** 가입 없이 남기는 글의 표시명 */
  scope?: 'member' | 'guest'
  debounceMs?: number
}

const IDLE: NicknameAvailability = { status: 'idle', message: null }

/** 입력이 멈추면 서버에 닉네임 중복 여부를 확인한다 */
export function useNicknameAvailability(
  nickname: string,
  {
    currentNickname,
    enabled = true,
    scope = 'member',
    debounceMs = 400,
  }: UseNicknameAvailabilityOptions = {},
): NicknameAvailability {
  const t = useT('me')
  const [result, setResult] = useState<NicknameAvailability>(IDLE)
  const [checkedKey, setCheckedKey] = useState<string>('')

  const trimmed = nickname.trim()
  const isCurrent =
    Boolean(currentNickname) &&
    trimmed.toLowerCase() === currentNickname!.trim().toLowerCase()
  const shouldCheck = enabled && Boolean(trimmed) && !isCurrent
  const requestKey = `${scope}:${trimmed}`

  useEffect(() => {
    if (!shouldCheck) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ nickname: trimmed })
        if (scope === 'guest') params.set('scope', 'guest')
        const response = await fetch(`/api/agent-auth/nickname?${params}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        const data = (await response.json().catch(() => null)) as
          | { available?: boolean; error?: string }
          | null
        if (!response.ok) {
          setResult({
            status: 'error',
            message: data?.error || t('nickname.checkFailed'),
          })
        } else if (data?.available) {
          setResult({ status: 'available', message: t('nickname.available') })
        } else {
          setResult({
            status: 'taken',
            message: data?.error || t('nickname.taken'),
          })
        }
        setCheckedKey(requestKey)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Nickname availability error:', error)
        setResult({ status: 'error', message: t('nickname.checkFailed') })
        setCheckedKey(requestKey)
      }
    }, debounceMs)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [shouldCheck, trimmed, scope, debounceMs, requestKey, t])

  if (!shouldCheck) return IDLE
  if (checkedKey !== requestKey) return { status: 'checking', message: null }
  return result
}
