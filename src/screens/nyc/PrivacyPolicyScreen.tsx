import { NYC_PRIVACY_POLICY } from '@lib/constants/nycPrivacyPolicy'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

export function PrivacyPolicyScreen() {
  return (
    <LegalDocumentView
      doc={NYC_PRIVACY_POLICY}
      relatedHref='/nyc/terms-of-use'
      relatedLabel='Terms of Use →'
      relatedLabelKo='이용약관'
    />
  )
}
