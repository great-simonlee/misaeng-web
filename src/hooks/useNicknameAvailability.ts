'use client'

import { useEffect, useState } from 'react'

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
            message: data?.error || '닉네임 확인에 실패했어요.',
          })
        } else if (data?.available) {
          setResult({ status: 'available', message: '사용할 수 있는 닉네임이에요' })
        } else {
          setResult({
            status: 'taken',
            message: data?.error || '이미 사용 중인 닉네임이에요.',
          })
        }
        setCheckedKey(requestKey)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Nickname availability error:', error)
        setResult({ status: 'error', message: '닉네임 확인에 실패했어요.' })
        setCheckedKey(requestKey)
      }
    }, debounceMs)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [shouldCheck, trimmed, scope, debounceMs, requestKey])

  if (!shouldCheck) return IDLE
  if (checkedKey !== requestKey) return { status: 'checking', message: null }
  return result
}
