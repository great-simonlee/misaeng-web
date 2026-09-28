'use client'

import type { FocusEvent } from 'react'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

/** 자동 저장 구역 표시용 data 속성 — 포커스가 다른 구역으로 넘어가면 저장 */
export const AUTOSAVE_SECTION_ATTR = 'data-autosave-section'

function sectionOf(node: EventTarget | null): Element | null {
  if (!(node instanceof Element)) return null
  return node.closest(`[${AUTOSAVE_SECTION_ATTR}]`)
}

/**
 * 주기 저장 대신 "단계 전환" 시점에만 저장한다.
 * - `requestSave()`: 기록 추가·삭제 등 명시적 시점
 * - `handleSectionFocus`: 폼의 onFocus에 연결하면, 포커스가 다른 구역에 들어갈 때 저장
 * - 탭을 숨기거나 페이지를 떠날 때도 한 번 저장
 * 저장은 상태가 반영된 다음 렌더 이후에 실행돼 최신 값이 들어간다.
 */
export function useStepAutosave(save: () => void, enabled = true) {
  const [requestId, setRequestId] = useState(0)
  const lastSectionRef = useRef<Element | null>(null)

  const persist = useEffectEvent(() => {
    if (enabled) save()
  })

  useEffect(() => {
    if (requestId === 0) return
    persist()
  }, [requestId])

  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    const onPageHide = () => persist()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [enabled])

  const requestSave = useCallback(() => setRequestId((n) => n + 1), [])

  // blur의 relatedTarget은 리치 에디터 등에서 비어 있을 때가 많아, 포커스가 "도착한" 구역으로 판단한다.
  const handleSectionFocus = useCallback((e: FocusEvent<HTMLElement>) => {
    const next = sectionOf(e.target)
    if (!next) return
    const prev = lastSectionRef.current
    lastSectionRef.current = next
    if (prev && prev !== next) setRequestId((n) => n + 1)
  }, [])

  return { requestSave, handleSectionFocus }
}
