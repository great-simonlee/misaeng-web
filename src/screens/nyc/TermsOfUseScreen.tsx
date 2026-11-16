'use client'

import { useCityPath } from '@hooks/useCity'
import type { LegalViewDocument } from '@lib/constants/legalDocument'
import { useT } from '@lib/i18n/client'
import { BRAND_CONFIG } from '@lib/brand'
import { EllieoLegalDocumentView } from '@widgets/ellieo/EllieoLegalDocumentView'
import { LegalDocumentView } from '@widgets/nyc/LegalDocumentView'

/** Ellieo has its own document layout; Misaeng keeps LegalDocumentView */
const DocumentView = BRAND_CONFIG.theme === 'ellieo' ? EllieoLegalDocumentView : LegalDocumentView

/** doc은 page가 서버에서 보는 언어만 남겨 넘긴다 (toLegalViewDocument) */
export function TermsOfUseScreen({ doc }: { doc: LegalViewDocument }) {
  const href = useCityPath()
  const t = useT('legal.view')
  return (
    <DocumentView
      doc={doc}
      related={{
        href: href('/privacy-policy'),
        label: { en: 'Privacy Policy', ref: doc.refLocale ? t('privacyPolicy') : undefined },
      }}
    />
  )
}
