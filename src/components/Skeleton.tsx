import { cn } from '@lib'

type SkeletonProps = {
  className?: string
}

/** 왼쪽→오른쪽 shimmer 플레이스홀더 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-md', className)}
      aria-hidden
    />
  )
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-full', className)}
      aria-hidden
    />
  )
}
