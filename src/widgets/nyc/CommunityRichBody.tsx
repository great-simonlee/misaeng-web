import { sanitizeCommunityHtml } from '@lib/community/html'
import { cn } from '@lib'

type CommunityRichBodyProps = {
  html: string
  className?: string
}

export function CommunityRichBody({ html, className }: CommunityRichBodyProps) {
  const safe = sanitizeCommunityHtml(html)
  return (
    <div
      className={cn('prose-community', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
