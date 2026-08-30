import { NYC_TERMS_OF_USE } from '@lib/constants/nycTermsOfUse'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

export function TermsOfUseScreen() {
  return (
    <LegalDocumentView
      doc={NYC_TERMS_OF_USE}
      relatedHref='/nyc/privacy-policy'
      relatedLabel='Privacy Policy →'
      relatedLabelKo='개인정보처리방침'
    />
  )
}
