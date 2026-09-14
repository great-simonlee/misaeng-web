'use client'

import { useCityPath } from '@hooks/useCity'
import { NYC_PRIVACY_POLICY } from '@lib/constants/nycPrivacyPolicy'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

export function PrivacyPolicyScreen() {
  const href = useCityPath()
  return (
    <LegalDocumentView
      doc={NYC_PRIVACY_POLICY}
      relatedHref={href('/terms-of-use')}
      relatedLabel='Terms of Use →'
      relatedLabelKo='이용약관'
    />
  )
}
