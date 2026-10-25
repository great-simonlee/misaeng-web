'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * 요소가 화면 근처(기본 300px 앞)에 처음 들어오면 true가 되고 계속 true로 남는다.
 * 지도처럼 보일 때만 만들면 되는 무거운 위젯에 쓴다 — CARTO 타일 요청(무료 한도)을 아낀다.
 *
 * `const [setContainer, visible] = useInView(containerRef)` → `<div ref={setContainer} />`
 * 요소가 나중에 그려져도(조건부 렌더) 그때부터 관찰한다. containerRef도 같이 채워 준다.
 */
export function useInView<T extends Element>(
  targetRef: RefObject<T | null>,
  { rootMargin = '300px' }: { rootMargin?: string } = {},
): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(false)
  const ref = useCallback(
    (element: T | null) => {
      targetRef.current = element
      setNode(element)
    },
    [targetRef],
  )

  useEffect(() => {
    if (inView || !node) return
    if (typeof IntersectionObserver === 'undefined') {
      const id = window.setTimeout(() => setInView(true), 0)
      return () => window.clearTimeout(id)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, rootMargin, inView])

  return [ref, inView]
}
