'use client'

import {
  Children,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@lib'

interface MarqueeRowProps {
  children: ReactNode
  className?: string
}

export function MarqueeRow({ children, className }: MarqueeRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const unitRef = useRef<HTMLDivElement>(null)
  const [repeat, setRepeat] = useState(4)
  const items = Children.toArray(children)

  useEffect(() => {
    const container = containerRef.current
    const unit = unitRef.current
    if (!container || !unit) return

    function update() {
      if (!container || !unit) return
      const unitWidth = unit.offsetWidth
      const viewWidth = container.clientWidth
      if (unitWidth <= 0 || viewWidth <= 0) return
      const unitsNeeded = Math.max(1, Math.ceil((viewWidth + 1) / unitWidth))
      setRepeat(Math.max(2, unitsNeeded * 2))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(unit)
    return () => ro.disconnect()
  }, [items.length])

  return (
    <div
      ref={containerRef}
      className={cn(
        'partner-marquee relative overflow-x-hidden py-0.5',
        className,
      )}
    >
      <div className='partner-marquee-track flex w-max'>
        {Array.from({ length: repeat }, (_, copyIndex) => (
          <div
            key={copyIndex}
            ref={copyIndex === 0 ? unitRef : undefined}
            className='flex gap-2 pr-2'
            aria-hidden={copyIndex > 0 || undefined}
            inert={copyIndex > 0 ? true : undefined}
          >
            {items}
          </div>
        ))}
      </div>
    </div>
  )
}
