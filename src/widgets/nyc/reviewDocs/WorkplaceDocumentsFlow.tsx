'use client'

import { useState } from 'react'

import { WORKPLACE_COMPANY_MAX } from '@lib/constants/workplace'
import { useT } from '@lib/i18n/client'
import { WORKPLACE_DOC_CONSENT_VERSION, WORKPLACE_DOC_KINDS } from '@lib/verification/reviewDocs'

import { ReviewVerificationFlow } from './ReviewVerificationFlow'

type SubmittedProfile = {
  workplaceStatus?: string | null
  workplaceKind?: string | null
  workplaceMethod?: string | null
  workplaceCompanyName?: string | null
}

/**
 * 재직·전 직장 서류로 직장 인증 (1.0.7). 후기 서류와 같은 흐름(안내·동의 → 종류 → 사진 가리기 → 업로드)에
 * 회사 이름과 현재/전 직장 선택을 더하고, POST /api/verifications/workplace로 보낸다. 결과는 ERP 직장 인증 대기열.
 */
export function WorkplaceDocumentsFlow({
  initialCompanyName,
  onClose,
  onSubmitted,
}: {
  initialCompanyName?: string | null
  onClose: () => void
  onSubmitted: (profile: SubmittedProfile | null) => void
}) {
  const t = useT('me.workplaceDocs')
  const [companyName, setCompanyName] = useState(initialCompanyName ?? '')
  const company = companyName.trim().replace(/\s+/g, ' ')

  return (
    <ReviewVerificationFlow
      postId=''
      kinds={[...WORKPLACE_DOC_KINDS]}
      onClose={onClose}
      onSubmitted={() => undefined}
      notice={{
        body: t('notice.body'),
        tips: [t('notice.examples'), t('notice.hide'), t('notice.deletion')],
      }}
      done={{ body: t('done.body'), detail: t('done.detail') }}
      kindExtraReady={company.length >= 2 && company.length <= WORKPLACE_COMPANY_MAX}
      kindExtra={
        <label className='block space-y-1.5'>
          <span className='text-[12px] font-medium text-[var(--muted)]'>{t('companyLabel')}</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={WORKPLACE_COMPANY_MAX}
            placeholder={t('companyPlaceholder')}
            className='h-11 w-full rounded-xl bg-[#f4f5f7] px-3.5 text-sm text-[var(--foreground)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--muted)] focus:bg-white focus:ring-[var(--brand)]/30'
          />
        </label>
      }
      upload={async ({ kind, files }) => {
        const form = new FormData()
        form.set('workplaceKind', kind === 'workplace_former' ? 'former' : 'current')
        form.set('companyName', company)
        form.set('consent', 'true')
        form.set('consentVersion', WORKPLACE_DOC_CONSENT_VERSION)
        form.set('source', 'web')
        for (const file of files) form.append('files', file.blob, file.name)
        const res = await fetch('/api/verifications/workplace', { method: 'POST', body: form, credentials: 'include' })
        const data = (await res.json().catch(() => null)) as { error?: string; profile?: SubmittedProfile } | null
        if (!res.ok) throw new Error(data?.error || t('uploadFailed'))
        onSubmitted(data?.profile ?? null)
      }}
    />
  )
}
