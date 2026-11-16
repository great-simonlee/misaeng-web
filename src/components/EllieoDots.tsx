import { cn } from '@lib'

/**
 * The one Ellieo loader (docs/design/ellieo-social.md): three dots — violet, violet, lime — hopping in turn.
 * Full-page, section and button-busy states all use it. Motion lives in ellieo-theme.css (.ellieo-dots);
 * reduced motion turns the hop into a gentle opacity pulse. Misaeng keeps its own spinners.
 */
export function EllieoDots({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn('ellieo-dots', className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className='ellieo-dot' />
      <span className='ellieo-dot' />
      <span className='ellieo-dot' />
    </span>
  )
}
