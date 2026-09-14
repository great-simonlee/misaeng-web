'use client'

import { useCityPath } from '@hooks/useCity'
import { NYC_TERMS_OF_USE } from '@lib/constants/nycTermsOfUse'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

export function TermsOfUseScreen() {
  const href = useCityPath()
  return (
    <LegalDocumentView
      doc={NYC_TERMS_OF_USE}
      relatedHref={href('/privacy-policy')}
      relatedLabel='Privacy Policy →'
      relatedLabelKo='개인정보처리방침'
    />
  )
}
