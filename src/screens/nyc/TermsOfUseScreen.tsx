'use client'

import { useCityPath } from '@hooks/useCity'
import type { LegalViewDocument } from '@lib/constants/legalDocument'
import { useT } from '@lib/i18n/client'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

/** doc은 page가 서버에서 보는 언어만 남겨 넘긴다 (toLegalViewDocument) */
export function TermsOfUseScreen({ doc }: { doc: LegalViewDocument }) {
  const href = useCityPath()
  const t = useT('legal.view')
  return (
    <LegalDocumentView
      doc={doc}
      related={{
        href: href('/privacy-policy'),
        label: { en: 'Privacy Policy', ref: doc.refLocale ? t('privacyPolicy') : undefined },
      }}
    />
  )
}
