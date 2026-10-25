'use client'

import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingState, TipTapEditor } from '@components'
import { useConsentLocale } from '@components/consent/ConsentLocaleProvider'
import { TermsConsentFields } from '@components/consent/TermsConsentFields'
import { NicknameAvailabilityHint } from '@components/NicknameAvailabilityHint'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { useNicknameAvailability } from '@hooks/useNicknameAvailability'
import { useStepAutosave } from '@hooks/useStepAutosave'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  claimGuestPostsRequest,
  createGuestJobReviewRequest,
  type GuestJobReviewCreditInfo,
  localizeCommunityError,
} from '@lib/community/client'
import { COMMUNITY_BODY_MAX } from '@lib/community/food'
import {
  GUEST_NICKNAME_MAX,
  GUEST_NICKNAME_MIN,
  isValidGuestEmail,
  isValidGuestNickname,
  isValidLinkedinUrl,
} from '@lib/community/guest'
import { htmlToPlainText } from '@lib/community/html'
import {
  JOB_REVIEW_TIPS_MAX,
  getJobReviewTypeLabel,
  isJobReviewTimelineEntryComplete,
  isJobReviewTimelineEntryFilled,
  normalizeJobReviewTimeline,
  type JobReviewTimelineEntry,
} from '@lib/community/jobReview'
import { BRAND_CONFIG } from '@lib/brand'
import { useFormat, useT } from '@lib/i18n/client'
import { isAccountSuspended } from '@lib/community/schoolGate'
import {
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from '@lib/community/writeDraft'
import {
  DEFAULT_PRIVACY_VERSION,
  DEFAULT_TERMS_VERSION,
} from '@lib/consent/copy'
import type { LegalPolicy } from '@lib/consent/types'
import { hrefForCommunityPost } from '@lib/constants/cities'
import {
  COMMUNITY_CREDIT_BONUS_RULES,
  COMMUNITY_CREDIT_REDEEM_OPTIONS,
  COMMUNITY_CREDIT_TIMELINE_ENTRY,
  COMMUNITY_CREDIT_TIMELINE_POST_MAX,
} from '@lib/constants/communityCredit'
import { communityBoardKey } from '@lib/constants/nyc'
import { isGoogleSignInConfigured } from '@lib/google/config'
import { cn } from '@lib'
import type { CommunityPost, JobReviewTypeId } from '@/types/nyc'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { BoardBackLink, BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { GoogleSignInButton } from '@widgets/nyc/GoogleSignInButton'
import { JobReviewTimelineEditor } from '@widgets/nyc/JobReviewTimelineEditor'
import { JobReviewTypePicker } from '@widgets/nyc/JobReviewTypeBadge'
import {
  isJobReviewSourceComplete,
  JobReviewOutcomePicker,
  JobReviewSourcePicker,
} from '@widgets/nyc/JobReviewSourcePicker'
import type { JobReviewOutcomeId, JobReviewSourceId } from '@lib/community/jobReview'
import { StatusEmployerSelect } from '@widgets/nyc/StatusEmployerSelect'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'
import { AutosaveNotice } from '@widgets/nyc/AutosaveNotice'

/**
 * 가입 없이 남기는 면접·취업 후기 (현직자 초대용).
 * 1) 선택: Google로 가입하고 남기기 / 가입 없이 남기기
 * 2) 작성: 연락처(닉네임·이메일·LinkedIn·커피챗) + 기존 후기 폼
 * 3) 완료: 크레딧 안내 + 선택적 가입(같은 이메일이면 글·크레딧 자동 연결)
 */

type Phase = 'choose' | 'write' | 'done'
type WriteMode = 'guest' | 'member'

type GuestWriteDraft = {
  nickname: string
  email: string
  linkedinUrl: string
  coffeeChatOk: boolean
  postTitle: string
  contentHtml: string
  location: string
  industry: string
  jobReviewType: JobReviewTypeId | null
  timeline: JobReviewTimelineEntry[]
}

const BOARD_ID = 'job-review' as const
const DRAFT_UID_GUEST = 'guest'

const FIRST_POST_BONUS =
  COMMUNITY_CREDIT_BONUS_RULES.find((rule) => rule.id === 'first-post')?.amount ?? 0
const COFFEE_CHAT_COST =
  COMMUNITY_CREDIT_REDEEM_OPTIONS.find((option) => option.id === 'coffee-chat')
    ?.cost ?? 120

export function JobReviewGuestWriteScreen() {
  const city = useCity()
  const href = useCityPath()
  const { user, profile, loading, signInGoogle } = useAuth()
  const { success, error: toastError } = useToast()
  const t = useT('reviews')
  const tCommunity = useT('community')
  const format = useFormat()
  const { locale } = useConsentLocale()

  const [phase, setPhase] = useState<Phase>('choose')
  const [mode, setMode] = useState<WriteMode>('guest')

  // 연락처
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [coffeeChatOk, setCoffeeChatOk] = useState(false)
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [honeypot, setHoneypot] = useState('')

  // 후기 본문 (JobReviewWriteScreen 생성 폼과 동일)
  const [postTitle, setPostTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [jobReviewType, setJobReviewType] = useState<JobReviewTypeId | null>(null)
  const [jobReviewSource, setJobReviewSource] = useState<JobReviewSourceId | null>(null)
  const [jobReviewSourceOrgId, setJobReviewSourceOrgId] = useState<string | null>(null)
  const [jobReviewOutcome, setJobReviewOutcome] = useState<JobReviewOutcomeId | null>(null)
  const sourceComplete = isJobReviewSourceComplete(jobReviewSource, jobReviewSourceOrgId)
  const [timeline, setTimeline] = useState<JobReviewTimelineEntry[]>([])
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    post: CommunityPost
    credit: GuestJobReviewCreditInfo
  } | null>(null)

  // Google 가입 (선택 단계 · 완료 단계 공용)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  const [policy, setPolicy] = useState<LegalPolicy | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [claim, setClaim] = useState<{
    linkedCount: number
    creditAwarded: number
  } | null>(null)
  const canUseGoogle = useMemo(() => isGoogleSignInConfigured(), [])

  const consentPayload = useMemo(
    () => ({
      acceptedTerms,
      termsVersion: policy?.termsVersion || DEFAULT_TERMS_VERSION,
      privacyVersion: policy?.privacyVersion || DEFAULT_PRIVACY_VERSION,
      uiLanguage: locale,
    }),
    [acceptedTerms, locale, policy?.privacyVersion, policy?.termsVersion],
  )

  useEffect(() => {
    let cancelled = false
    void fetch('/api/legal/policy', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { policy?: LegalPolicy }) => {
        if (!cancelled && data?.policy) setPolicy(data.policy)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  // 이미 로그인한 사용자는 선택 단계를 건너뛰고 계정에 바로 연결해 작성
  useEffect(() => {
    if (loading || !user) return
    setMode('member')
    if (phase === 'choose') setPhase('write')
    setEmail((prev) => prev || user.email || '')
    setNickname((prev) => prev || profile?.nickname?.trim() || '')
  }, [loading, user, profile?.nickname, phase])

  const draftUid = user?.uid || DRAFT_UID_GUEST

  const nicknameAvailability = useNicknameAvailability(nickname, {
    scope: 'guest',
    currentNickname: profile?.nickname,
    enabled: phase === 'write' && isValidGuestNickname(nickname),
  })

  useEffect(() => {
    if (loading || draftHydrated) return
    const stored = loadWriteDraft<GuestWriteDraft>(BOARD_ID, city, `${draftUid}:share`)
    if (stored) {
      setNickname((prev) => prev || stored.data.nickname || '')
      setEmail((prev) => prev || stored.data.email || '')
      setLinkedinUrl(stored.data.linkedinUrl || '')
      setCoffeeChatOk(Boolean(stored.data.coffeeChatOk))
      setPostTitle(stored.data.postTitle || '')
      setContentHtml(stored.data.contentHtml || '')
      setLocation(stored.data.location || '')
      setIndustry(stored.data.industry || '')
      setJobReviewType(stored.data.jobReviewType ?? null)
      setTimeline(Array.isArray(stored.data.timeline) ? stored.data.timeline : [])
      setDraftSavedAt(stored.savedAt)
    }
    setDraftHydrated(true)
  }, [city, draftHydrated, draftUid, loading])

  const persistDraft = useCallback((): number => {
    const savedAt = saveWriteDraft<GuestWriteDraft>(
      BOARD_ID,
      city,
      `${draftUid}:share`,
      {
        nickname,
        email,
        linkedinUrl,
        coffeeChatOk,
        postTitle,
        contentHtml,
        location,
        industry,
        jobReviewType,
        timeline,
      },
    )
    setDraftSavedAt(savedAt)
    return savedAt
  }, [
    city,
    coffeeChatOk,
    contentHtml,
    draftUid,
    email,
    industry,
    jobReviewType,
    linkedinUrl,
    location,
    nickname,
    postTitle,
    timeline,
  ])

  const handleSaveDraft = useCallback(() => {
    try {
      persistDraft()
      success(t('write.draftSaved'))
    } catch {
      toastError(t('write.draftSaveFailed'))
    }
  }, [persistDraft, success, t, toastError])

  const { requestSave, handleSectionFocus } = useStepAutosave(() => {
    try {
      persistDraft()
    } catch (err) {
      console.error('Guest job review autosave error:', err)
    }
  }, draftHydrated && phase === 'write' && !submitting)

  const handleGoogleCredential = useCallback(
    async (
      credential: { idToken: string; email: string | null; name: string | null },
      after: 'write' | 'claim',
    ) => {
      if (!acceptedTerms) {
        setShowTermsError(true)
        return
      }
      setSigningIn(true)
      try {
        await signInGoogle({ ...credential, consent: consentPayload })
        if (after === 'write') {
          setMode('member')
          setPhase('write')
          success(t('guest.signedIn'))
          return
        }
        try {
          const claimed = await claimGuestPostsRequest()
          setClaim({
            linkedCount: claimed.posts.length,
            creditAwarded: claimed.creditAwarded,
          })
          success(
            claimed.posts.length > 0
              ? t('guest.claimLinked')
              : t('guest.claimDone'),
          )
        } catch (claimError) {
          setClaim({ linkedCount: 0, creditAwarded: 0 })
          toastError(getErrorMessage(localizeCommunityError(claimError, tCommunity), t('guest.claimFailed')))
        }
      } catch (err) {
        toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('guest.googleFailed')))
      } finally {
        setSigningIn(false)
      }
    },
    [acceptedTerms, consentPayload, signInGoogle, success, t, tCommunity, toastError],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!isValidGuestNickname(nickname)) {
      toastError(
        t('guest.errors.nicknameLength', {
          min: GUEST_NICKNAME_MIN,
          max: GUEST_NICKNAME_MAX,
        }),
      )
      return
    }
    if (nicknameAvailability.status === 'taken') {
      toastError(t('guest.errors.nicknameTaken'))
      return
    }
    if (!isValidGuestEmail(email)) {
      toastError(t('guest.errors.emailInvalid'))
      return
    }
    if (!isValidLinkedinUrl(linkedinUrl)) {
      toastError(t('guest.errors.linkedinInvalid'))
      return
    }
    if (!jobReviewType) {
      toastError(t('jobReview.write.errors.typeRequired'))
      return
    }
    if (!postTitle.trim()) {
      toastError(t('guest.errors.titleRequired'))
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError(t('jobReview.write.errors.tipsRequired'))
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        t('jobReview.write.errors.tipsTooLong', {
          max: format.number(COMMUNITY_BODY_MAX),
        }),
      )
      return
    }

    const readyTimeline = timeline.filter(isJobReviewTimelineEntryComplete)
    const normalizedTimeline = normalizeJobReviewTimeline(readyTimeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        t('jobReview.write.errors.timelineRequired'),
      )
      return
    }
    const incomplete = timeline.find(
      (entry) =>
        isJobReviewTimelineEntryFilled(entry) &&
        !isJobReviewTimelineEntryComplete(entry),
    )
    if (incomplete) {
      toastError(t('write.errors.timelineIncomplete'))
      return
    }
    if (!jobReviewOutcome) {
      toastError(t('jobReview.write.errors.outcomeRequired'))
      return
    }
    if (!jobReviewSource || !sourceComplete) {
      toastError(
        jobReviewSource === 'student-org'
          ? t('jobReview.write.errors.orgRequired')
          : t('jobReview.write.errors.sourceRequired'),
      )
      return
    }
    if (!guidelinesAccepted) {
      toastError(t('guest.errors.guidelinesRequired'))
      return
    }

    setSubmitting(true)
    try {
      const created = await createGuestJobReviewRequest({
        title: postTitle.trim(),
        contentHtml,
        location: location.trim(),
        jobReviewIndustry: industry.trim() || null,
        detail: getJobReviewTypeLabel(jobReviewType),
        jobReviewType,
        jobReviewTimeline: normalizedTimeline,
        jobReviewTips: plain.slice(0, JOB_REVIEW_TIPS_MAX) || null,
        jobReviewSource,
        jobReviewSourceOrgId,
        jobReviewOutcome,
        guest: {
          nickname: nickname.trim(),
          email: email.trim(),
          linkedinUrl: linkedinUrl.trim(),
          coffeeChatOk,
          guidelinesAccepted,
        },
        website: honeypot,
      })
      // 작성 도중 로그인했다면 게스트 키에도 예전 초안이 남아 있다.
      clearWriteDraft(BOARD_ID, city, `${draftUid}:share`)
      clearWriteDraft(BOARD_ID, city, `${DRAFT_UID_GUEST}:share`)
      setResult(created)
      setPhase('done')
      setAcceptedTerms(false)
      setShowTermsError(false)
      success(t('guest.created'))
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    } catch (err) {
      toastError(getErrorMessage(localizeCommunityError(err, tCommunity), t('guest.createFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  if (user && isAccountSuspended(profile)) {
    return <AccountSuspendedNotice />
  }

  const listHref = href(`/${BOARD_ID}`)

  return (
    <BoardPageShell width='narrow'>
      <div className='pb-16 pt-4 sm:pt-6'>
        <BoardBackLink
          href={listHref}
          label={t('guest.backToList')}
          className='mb-5'
        />

        {phase === 'choose' ? (
          <ChoosePhase
            canUseGoogle={canUseGoogle}
            acceptedTerms={acceptedTerms}
            showTermsError={showTermsError}
            signingIn={signingIn || loading}
            onTermsChange={(next) => {
              setAcceptedTerms(next)
              if (next) setShowTermsError(false)
            }}
            onGoogleCredential={(credential) =>
              void handleGoogleCredential(credential, 'write')
            }
            onGoogleError={toastError}
            onGuest={() => {
              setMode('guest')
              setPhase('write')
            }}
          />
        ) : null}

        {phase === 'write' && !draftHydrated ? (
          <LoadingState label={t('guest.checkingDraft')} />
        ) : null}

        {phase === 'write' && draftHydrated ? (
          <>
            <WriteHero mode={mode} writeLabel={tCommunity(communityBoardKey(BOARD_ID, 'writeLabel'))} />
            <form
              onSubmit={(e) => void handleSubmit(e)}
              onFocus={handleSectionFocus}
              className='mt-6 space-y-8'
            >
              <AutosaveNotice savedAt={draftSavedAt} />
              <CreateSection
                step={1}
                title={t('guest.authorSection')}
                description={
                  mode === 'member'
                    ? t('guest.authorSectionMember')
                    : t('guest.authorSectionGuest')
                }
              >
                <div className='space-y-4'>
                  <Field
                    label={t('guest.nicknameLabel')}
                    required
                    hint={t('guest.nicknameHint')}
                  >
                    <input
                      required
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className={inputClass}
                      maxLength={GUEST_NICKNAME_MAX}
                      placeholder={t('guest.nicknamePlaceholder')}
                      autoComplete='nickname'
                    />
                    <NicknameAvailabilityHint
                      availability={nicknameAvailability}
                      className='mt-1.5'
                    />
                  </Field>
                  <Field
                    label={t('guest.emailLabel')}
                    required
                    hint={
                      mode === 'member'
                        ? t('guest.emailHintMember')
                        : t('guest.emailHintGuest')
                    }
                  >
                    <input
                      required
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={mode === 'member' && Boolean(user?.email)}
                      className={cn(
                        inputClass,
                        mode === 'member' && user?.email && 'bg-[#f4f5f7] text-[var(--muted-foreground)]',
                      )}
                      placeholder='you@company.com'
                      autoComplete='email'
                    />
                  </Field>
                  <Field
                    label={t('guest.linkedinLabel')}
                    required
                    hint={t('guest.linkedinHint')}
                  >
                    {/* type=text: 브라우저의 url 검증은 스킴 없는 붙여넣기를 막는다. 형식은 제출 시 normalizeLinkedinUrl로 검사 */}
                    <input
                      required
                      type='text'
                      inputMode='url'
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className={inputClass}
                      placeholder='https://www.linkedin.com/in/your-name'
                      autoComplete='url'
                    />
                  </Field>
                  <label className='flex cursor-pointer items-start gap-3 rounded-xl bg-[#f4f5f7] px-3.5 py-3 ring-1 ring-black/[0.05]'>
                    <input
                      type='checkbox'
                      checked={coffeeChatOk}
                      onChange={(e) => setCoffeeChatOk(e.target.checked)}
                      className='mt-0.5 size-4 shrink-0 accent-[var(--brand)]'
                    />
                    <span className='min-w-0'>
                      <span className='block text-[13px] font-medium text-[var(--foreground)]'>
                        {t('guest.coffeeChatLabel')}{' '}
                        <span className='font-normal text-[var(--muted)]'>
                          {t('guest.optional')}
                        </span>
                      </span>
                      <span className='mt-0.5 block text-[12px] leading-relaxed text-[var(--muted)]'>
                        {t('guest.coffeeChatHint')}
                      </span>
                    </span>
                  </label>
                </div>
                {/* 허니팟 — 스크린리더·사람에게는 보이지 않음 */}
                <div className='hidden' aria-hidden>
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete='off'
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>
                </div>
              </CreateSection>

              <CreateSection step={2} title={t('jobReview.write.typeSection')}>
                <JobReviewTypePicker
                  value={jobReviewType}
                  onChange={(next) => {
                    setJobReviewType(next)
                    requestSave()
                  }}
                />
              </CreateSection>

              <CreateSection
                step={3}
                title={t('jobReview.write.basicSection')}
                description={t('jobReview.write.basicSectionDescription')}
              >
                <Field label={t('write.titleLabel')} required>
                  <input
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={inputClass}
                    placeholder={tCommunity(communityBoardKey(BOARD_ID, 'titlePlaceholder'))}
                  />
                </Field>
                <StatusEmployerSelect
                  className='mt-4'
                  value={location}
                  onChange={(next) => {
                    setLocation(next)
                    requestSave()
                  }}
                  label={tCommunity(communityBoardKey(BOARD_ID, 'locationLabel'))}
                />
              </CreateSection>

              <CreateSection
                step={4}
                title={t('jobReview.write.timelineSection')}
                description={t('write.timelineSectionDescription')}
              >
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='create'
                  onEntryCommit={requestSave}
                />
              </CreateSection>

              <CreateSection
                step={5}
                title={t('jobReview.write.tipsTitle')}
                description={t('jobReview.write.tipsDescription')}
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder={t('jobReview.write.tipsPlaceholder')}
                  minHeightClassName='min-h-[200px]'
                  contentClassName='!text-[13px] !leading-[1.65]'
                  simpleToolbar
                  maxLength={COMMUNITY_BODY_MAX}
                />
              </CreateSection>

              <CreateSection
                step={6}
                title={t('jobReview.write.outcomeSection')}
                description={t('jobReview.write.outcomeSectionDescription')}
              >
                <JobReviewOutcomePicker value={jobReviewOutcome} onChange={setJobReviewOutcome} />
              </CreateSection>

              <CreateSection
                step={7}
                title={t('jobReview.write.sourceSection')}
                description={t('jobReview.write.sourceSectionDescription')}
              >
                <JobReviewSourcePicker
                  value={jobReviewSource}
                  orgId={jobReviewSourceOrgId}
                  onChange={(source, orgId) => {
                    setJobReviewSource(source)
                    setJobReviewSourceOrgId(orgId)
                  }}
                />
              </CreateSection>

              <section className='space-y-3'>
                <CommunityWritingGuidelines />
                <label className='flex cursor-pointer items-start gap-3 px-1'>
                  <input
                    type='checkbox'
                    checked={guidelinesAccepted}
                    onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                    className='mt-0.5 size-4 shrink-0 accent-[var(--brand)]'
                  />
                  <span className='text-[13px] leading-relaxed text-[var(--foreground)]'>
                    {t('guest.guidelinesAgree')}
                    <span className='text-[var(--brand)]'> *</span>
                  </span>
                </label>
              </section>

              <CreditPreview timelineCount={timeline.filter(isJobReviewTimelineEntryComplete).length} mode={mode} />

              <WriteDraftActions
                onSave={handleSaveDraft}
                savedAt={draftSavedAt}
                disabled={submitting}
              >
                <button
                  type='submit'
                  disabled={
                    submitting || !postTitle.trim() || !jobReviewType || !jobReviewOutcome || !sourceComplete
                  }
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
                >
                  {submitting
                    ? t('write.submitting')
                    : !jobReviewType
                      ? t('write.selectTypeFirst')
                      : !jobReviewOutcome
                        ? t('jobReview.write.errors.outcomeRequired')
                        : !sourceComplete
                          ? t('jobReview.write.selectSourceFirst')
                          : mode === 'member'
                        ? t('write.submit')
                        : t('guest.submitGuest')}
                </button>
              </WriteDraftActions>

              <p className='text-center text-[12px] text-[var(--muted)]'>
                {mode === 'guest' ? (
                  <>
                    {t('guest.footnoteBefore')}{' '}
                    <button
                      type='button'
                      onClick={() => {
                        setPhase('choose')
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
                      }}
                      className='font-medium text-[var(--brand)] underline-offset-2 hover:underline'
                    >
                      {t('guest.footnoteLink')}
                    </button>
                    {t('guest.footnoteAfter')}
                  </>
                ) : (
                  t('guest.footnoteMember')
                )}
              </p>
            </form>
          </>
        ) : null}

        {phase === 'done' && result ? (
          <DonePhase
            post={result.post}
            credit={result.credit}
            city={city}
            listHref={listHref}
            creditHref={href('/credit')}
            isMember={Boolean(user)}
            claim={claim}
            canUseGoogle={canUseGoogle}
            acceptedTerms={acceptedTerms}
            showTermsError={showTermsError}
            signingIn={signingIn}
            onTermsChange={(next) => {
              setAcceptedTerms(next)
              if (next) setShowTermsError(false)
            }}
            onGoogleCredential={(credential) =>
              void handleGoogleCredential(credential, 'claim')
            }
            onGoogleError={toastError}
          />
        ) : null}
      </div>
    </BoardPageShell>
  )
}

/* ---------- 1) 선택 ---------- */

function ChoosePhase({
  canUseGoogle,
  acceptedTerms,
  showTermsError,
  signingIn,
  onTermsChange,
  onGoogleCredential,
  onGoogleError,
  onGuest,
}: {
  canUseGoogle: boolean
  acceptedTerms: boolean
  showTermsError: boolean
  signingIn: boolean
  onTermsChange: (next: boolean) => void
  onGoogleCredential: (credential: {
    idToken: string
    email: string | null
    name: string | null
  }) => void
  onGoogleError: (message: string) => void
  onGuest: () => void
}) {
  const t = useT('reviews')
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        {t('guest.choose.eyebrow')}
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {t('guest.choose.title')}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {t('guest.choose.intro')}
      </p>

      <CreditPitch />

      <div className='mt-6 space-y-3'>
        <section className='rounded-2xl bg-white p-4 ring-1 ring-[var(--brand)]/30 sm:p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
                {t('guest.choose.recommended')}
              </p>
              <h2 className='mt-1 text-[15px] font-semibold text-[var(--foreground)]'>
                {t('guest.choose.googleTitle')}
              </h2>
            </div>
          </div>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>{t('guest.choose.googlePitch1')}</PitchItem>
            <PitchItem>{t('guest.choose.googlePitch2')}</PitchItem>
          </ul>
          <div className='mt-4 space-y-3'>
            <TermsConsentFields
              checked={acceptedTerms}
              onChange={onTermsChange}
              error={showTermsError}
              showLocaleToggle={false}
            />
            <GoogleSignInButton
              disabled={signingIn || !canUseGoogle}
              onCredential={onGoogleCredential}
              onError={onGoogleError}
            />
          </div>
        </section>

        <section className='rounded-2xl bg-white p-4 ring-1 ring-black/[0.06] sm:p-5'>
          <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
            {t('guest.choose.guestTitle')}
          </h2>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>{t('guest.choose.guestPitch1')}</PitchItem>
            <PitchItem>{t('guest.choose.guestPitch2')}</PitchItem>
          </ul>
          <button
            type='button'
            onClick={onGuest}
            className='mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90'
          >
            {t('guest.choose.guestCta')}
          </button>
        </section>
      </div>
    </div>
  )
}

function CreditPitch() {
  const t = useT('reviews')
  return (
    <div className='mt-5 rounded-2xl bg-brand-soft p-4 ring-1 ring-[var(--brand)]/15 sm:p-5'>
      <p className='text-[12px] font-semibold text-[var(--brand)]'>
        {t('guest.creditPitch.title')}
      </p>
      <ul className='mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
        <PitchItem accent>
          {t(
            FIRST_POST_BONUS > 0
              ? 'guest.creditPitch.perStepWithBonus'
              : 'guest.creditPitch.perStep',
            {
              perStep: COMMUNITY_CREDIT_TIMELINE_ENTRY,
              max: COMMUNITY_CREDIT_TIMELINE_POST_MAX,
              bonus: FIRST_POST_BONUS,
            },
          )}
        </PitchItem>
        <PitchItem accent>
          {t('guest.creditPitch.review')}
        </PitchItem>
        <PitchItem accent>
          {t('guest.creditPitch.coffeeChat', { cost: COFFEE_CHAT_COST })}
        </PitchItem>
        <PitchItem accent>
          {t('guest.creditPitch.optionalSignup')}
        </PitchItem>
      </ul>
    </div>
  )
}

function PitchItem({
  children,
  accent = false,
}: {
  children: ReactNode
  accent?: boolean
}) {
  return (
    <li className='flex gap-2'>
      <span
        className={cn(
          'mt-[7px] size-1.5 shrink-0 rounded-full',
          accent ? 'bg-[var(--brand)]/70' : 'bg-[var(--muted)]/60',
        )}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  )
}

/* ---------- 2) 작성 ---------- */

function WriteHero({ mode, writeLabel }: { mode: WriteMode; writeLabel: string }) {
  const t = useT('reviews')
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        {mode === 'member' ? t('guest.hero.memberEyebrow') : t('guest.choose.guestTitle')}
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {writeLabel}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {mode === 'member'
          ? t('guest.hero.memberIntro')
          : t('guest.hero.guestIntro')}
      </p>
    </div>
  )
}

function CreditPreview({
  timelineCount,
  mode,
}: {
  timelineCount: number
  mode: WriteMode
}) {
  const t = useT('reviews')
  const estimated = Math.min(
    timelineCount * COMMUNITY_CREDIT_TIMELINE_ENTRY,
    COMMUNITY_CREDIT_TIMELINE_POST_MAX,
  )
  return (
    <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px] ring-1 ring-[var(--brand)]/15'>
      <span className='text-[var(--muted-foreground)]'>
        {t('guest.preview.count', { count: timelineCount })}
      </span>
      <span className='font-semibold text-[var(--brand)]'>
        {t(
          `guest.preview.${mode === 'member' ? 'member' : 'guest'}${FIRST_POST_BONUS > 0 ? 'WithBonus' : ''}`,
          { credit: estimated, bonus: FIRST_POST_BONUS },
        )}
      </span>
    </div>
  )
}

/* ---------- 3) 완료 ---------- */

function DonePhase({
  post,
  credit,
  city,
  listHref,
  creditHref,
  isMember,
  claim,
  canUseGoogle,
  acceptedTerms,
  showTermsError,
  signingIn,
  onTermsChange,
  onGoogleCredential,
  onGoogleError,
}: {
  post: CommunityPost
  credit: GuestJobReviewCreditInfo
  city: Parameters<typeof hrefForCommunityPost>[1]
  listHref: string
  creditHref: string
  isMember: boolean
  claim: { linkedCount: number; creditAwarded: number } | null
  canUseGoogle: boolean
  acceptedTerms: boolean
  showTermsError: boolean
  signingIn: boolean
  onTermsChange: (next: boolean) => void
  onGoogleCredential: (credential: {
    idToken: string
    email: string | null
    name: string | null
  }) => void
  onGoogleError: (message: string) => void
}) {
  const t = useT('reviews')
  const postHref = hrefForCommunityPost(post, city)
  const linkedNow = credit.linked || (claim?.linkedCount ?? 0) > 0
  const awarded = credit.linked ? credit.awarded : claim?.creditAwarded ?? 0
  const pending = credit.estimated + credit.firstPostBonus

  return (
    <div>
      <div className='rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-6'>
        <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
          {t('guest.done.eyebrow')}
        </p>
        <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.5rem]'>
          {t('guest.done.title')}
        </h1>
        <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
          {t('guest.done.body', {
            title: post.title,
            count: post.jobReviewTimeline.length,
          })}
        </p>

        <div className='mt-4 rounded-xl bg-brand-soft px-4 py-3.5 ring-1 ring-[var(--brand)]/15'>
          {linkedNow ? (
            <>
              <p className='text-[13px] font-semibold text-[var(--brand)]'>
                {awarded > 0
                  ? t('guest.done.awarded', { credit: awarded })
                  : t('guest.done.linked')}
              </p>
              <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
                {t('guest.done.coffeeChat', { cost: COFFEE_CHAT_COST })}
              </p>
            </>
          ) : (
            <>
              <p className='text-[13px] font-semibold text-[var(--brand)]'>
                {t('guest.done.pending', { credit: pending })}
              </p>
              <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
                {t(
                  credit.firstPostBonus > 0
                    ? 'guest.done.breakdownWithBonus'
                    : 'guest.done.breakdown',
                  {
                    count: post.jobReviewTimeline.length,
                    credit: credit.estimated,
                    bonus: credit.firstPostBonus,
                  },
                )}
              </p>
            </>
          )}
        </div>

        <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
          <Link
            href={postHref}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white transition hover:opacity-90'
          >
            {t('guest.done.viewPost')}
          </Link>
          <Link
            href={linkedNow ? creditHref : listHref}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.1] transition hover:bg-[#fafafa]'
          >
            {linkedNow ? t('guest.done.viewCredit') : t('guest.done.toList')}
          </Link>
        </div>
      </div>

      {!isMember && !linkedNow ? (
        <section className='mt-4 rounded-2xl bg-white p-5 ring-1 ring-[var(--brand)]/30 sm:p-6'>
          <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
            {t('guest.done.optional')}
          </p>
          <h2 className='mt-1 text-[16px] font-semibold text-[var(--foreground)]'>
            {t('guest.done.signupTitle', { brand: BRAND_CONFIG.name })}
          </h2>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>{t('guest.done.signupPitch1', { credit: pending })}</PitchItem>
            <PitchItem>{t('guest.done.signupPitch2')}</PitchItem>
            <PitchItem>{t('guest.done.signupPitch3')}</PitchItem>
          </ul>
          {claim && claim.linkedCount === 0 ? (
            <p className='mt-3 rounded-xl bg-[#f4f5f7] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
              {t('guest.done.emailMismatch')}
            </p>
          ) : null}
          <div className='mt-4 space-y-3'>
            <TermsConsentFields
              checked={acceptedTerms}
              onChange={onTermsChange}
              error={showTermsError}
              showLocaleToggle={false}
            />
            <GoogleSignInButton
              disabled={signingIn || !canUseGoogle}
              onCredential={onGoogleCredential}
              onError={onGoogleError}
            />
          </div>
          <p className='mt-3 text-center text-[12px] text-[var(--muted)]'>
            {t('guest.done.skipNote')}{' '}
            <Link href={listHref} className='underline-offset-2 hover:underline'>
              {t('guest.done.skip')}
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  )
}

/* ---------- 공용 ---------- */

function CreateSection({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section data-autosave-section={`step-${step}`}>
      <div className='mb-3 flex items-start gap-3'>
        <span className='inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[12px] font-bold text-white'>
          {step}
        </span>
        <div className='min-w-0'>
          <h2 className='text-[15px] font-semibold text-[var(--foreground)]'>
            {title}
          </h2>
          {description ? (
            <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className='pl-10'>{children}</div>
    </section>
  )
}

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl bg-white px-3.5 text-[15px] outline-none ring-1 ring-black/[0.08] transition placeholder:text-[var(--muted)] focus:ring-black/20'

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('block', className)}>
      <span className='flex items-baseline justify-between gap-2'>
        <span className='text-[13px] font-medium text-[var(--foreground)]'>
          {label}
          {required ? <span className='text-[var(--brand)]'> *</span> : null}
        </span>
        {hint ? (
          <span className='text-[11px] text-[var(--muted)]'>{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  )
}
