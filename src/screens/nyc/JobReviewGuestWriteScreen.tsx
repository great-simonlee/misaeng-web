'use client'

import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TipTapEditor } from '@components'
import { useConsentLocale } from '@components/consent/ConsentLocaleProvider'
import { TermsConsentFields } from '@components/consent/TermsConsentFields'
import { NicknameAvailabilityHint } from '@components/NicknameAvailabilityHint'
import { useAuth } from '@hooks/useAuth'
import { useCity, useCityPath } from '@hooks/useCity'
import { useNicknameAvailability } from '@hooks/useNicknameAvailability'
import { getErrorMessage, useToast } from '@hooks/useToast'
import {
  claimGuestPostsRequest,
  createGuestJobReviewRequest,
  type GuestJobReviewCreditInfo,
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
import { NYC_COMMUNITY_BOARD_META } from '@lib/constants/nyc'
import { isGoogleSignInConfigured } from '@lib/google/config'
import { cn } from '@lib'
import type { CommunityPost, JobReviewTypeId } from '@/types/nyc'
import { AccountSuspendedNotice } from '@widgets/nyc/AccountSuspendedNotice'
import { BoardBackLink, BoardPageShell } from '@widgets/nyc/BoardPageShell'
import { CommunityWritingGuidelines } from '@widgets/nyc/CommunityWritingGuidelines'
import { GoogleSignInButton } from '@widgets/nyc/GoogleSignInButton'
import { JobReviewTimelineEditor } from '@widgets/nyc/JobReviewTimelineEditor'
import { JobReviewTypePicker } from '@widgets/nyc/JobReviewTypeBadge'
import { StatusEmployerSelect } from '@widgets/nyc/StatusEmployerSelect'
import { WriteDraftActions } from '@widgets/nyc/WriteDraftActions'

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
  const meta = NYC_COMMUNITY_BOARD_META[BOARD_ID]
  const { user, profile, loading, signInGoogle } = useAuth()
  const { success, error: toastError } = useToast()
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

  const handleSaveDraft = useCallback(() => {
    try {
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
      success('임시 저장했어요')
    } catch {
      toastError('임시 저장에 실패했어요')
    }
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
    success,
    timeline,
    toastError,
  ])

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
          success('로그인했어요. 후기는 이 계정에 바로 적립돼요')
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
              ? '가입 완료! 방금 남긴 후기가 계정에 연결됐어요'
              : '가입이 완료됐어요',
          )
        } catch (claimError) {
          setClaim({ linkedCount: 0, creditAwarded: 0 })
          toastError(getErrorMessage(claimError, '후기 연결에 실패했어요'))
        }
      } catch (err) {
        toastError(getErrorMessage(err, 'Google 로그인에 실패했어요'))
      } finally {
        setSigningIn(false)
      }
    },
    [acceptedTerms, consentPayload, signInGoogle, success, toastError],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!isValidGuestNickname(nickname)) {
      toastError(
        `게시용 닉네임을 ${GUEST_NICKNAME_MIN}~${GUEST_NICKNAME_MAX}자로 입력해 주세요`,
      )
      return
    }
    if (nicknameAvailability.status === 'taken') {
      toastError('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요')
      return
    }
    if (!isValidGuestEmail(email)) {
      toastError('이메일을 정확히 입력해 주세요')
      return
    }
    if (!isValidLinkedinUrl(linkedinUrl)) {
      toastError('LinkedIn 프로필 주소를 확인해 주세요 (예: linkedin.com/in/your-name)')
      return
    }
    if (!jobReviewType) {
      toastError('인턴 / 신입 / 경력 / 이직 / 계약 중 유형을 선택해 주세요')
      return
    }
    if (!postTitle.trim()) {
      toastError('제목을 입력해 주세요')
      return
    }

    const plain = htmlToPlainText(contentHtml)
    if (!plain) {
      toastError('조심해야 할 점을 입력해 주세요')
      return
    }
    if (plain.length > COMMUNITY_BODY_MAX) {
      toastError(
        `조심해야 할 점은 ${COMMUNITY_BODY_MAX.toLocaleString('en-US')}자 이내로 작성해 주세요`,
      )
      return
    }

    const readyTimeline = timeline.filter(isJobReviewTimelineEntryComplete)
    const normalizedTimeline = normalizeJobReviewTimeline(readyTimeline)
    if (normalizedTimeline.length === 0) {
      toastError(
        '진행 기록(날짜 + 내용)을 최소 1건 입력한 뒤 「이 기록 추가」를 눌러 주세요',
      )
      return
    }
    const incomplete = timeline.find(
      (entry) =>
        isJobReviewTimelineEntryFilled(entry) &&
        !isJobReviewTimelineEntryComplete(entry),
    )
    if (incomplete) {
      toastError('작성 중인 기록에 날짜와 내용을 함께 입력해 주세요')
      return
    }
    if (!guidelinesAccepted) {
      toastError('커뮤니티 작성 안내에 동의해 주세요')
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
        guest: {
          nickname: nickname.trim(),
          email: email.trim(),
          linkedinUrl: linkedinUrl.trim(),
          coffeeChatOk,
          guidelinesAccepted,
        },
        website: honeypot,
      })
      clearWriteDraft(BOARD_ID, city, `${draftUid}:share`)
      setResult(created)
      setPhase('done')
      setAcceptedTerms(false)
      setShowTermsError(false)
      success('후기를 등록했어요. 감사합니다!')
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    } catch (err) {
      toastError(getErrorMessage(err, '등록에 실패했어요'))
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
          label='면접·취업 목록'
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

        {phase === 'write' ? (
          <>
            <WriteHero mode={mode} writeLabel={meta.writeLabel} />
            <form onSubmit={(e) => void handleSubmit(e)} className='mt-6 space-y-8'>
              <CreateSection
                step={1}
                title='작성자 정보'
                description={
                  mode === 'member'
                    ? '닉네임은 공개, LinkedIn은 재직 확인용으로만 사용해요'
                    : '닉네임만 공개돼요. 이메일·LinkedIn은 운영팀만 보고 게시되지 않아요'
                }
              >
                <div className='space-y-4'>
                  <Field
                    label='닉네임'
                    required
                    hint='게시용 · 공개'
                  >
                    <input
                      required
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className={inputClass}
                      maxLength={GUEST_NICKNAME_MAX}
                      placeholder='예: 뉴욕직장인'
                      autoComplete='nickname'
                    />
                    <NicknameAvailabilityHint
                      availability={nicknameAvailability}
                      className='mt-1.5'
                    />
                  </Field>
                  <Field
                    label='이메일'
                    required
                    hint={
                      mode === 'member'
                        ? '계정 이메일 · 비공개'
                        : '기프트카드·크레딧 안내 발송용 · 비공개'
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
                    label='LinkedIn 프로필 주소'
                    required
                    hint='실제 재직 확인용 · 비공개'
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
                        후배들의 커피챗 요청을 받아도 괜찮아요{' '}
                        <span className='font-normal text-[var(--muted)]'>(선택)</span>
                      </span>
                      <span className='mt-0.5 block text-[12px] leading-relaxed text-[var(--muted)]'>
                        체크해도 연락처는 공개되지 않아요. 요청이 오면 운영팀이 먼저
                        의사를 확인한 뒤 연결해 드려요.
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

              <CreateSection step={2} title='어떤 유형인가요?'>
                <JobReviewTypePicker value={jobReviewType} onChange={setJobReviewType} />
              </CreateSection>

              <CreateSection
                step={3}
                title='기본 정보'
                description='제목과 회사를 입력해 주세요'
              >
                <Field label='제목' required>
                  <input
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={inputClass}
                    placeholder={meta.titlePlaceholder}
                  />
                </Field>
                <StatusEmployerSelect
                  className='mt-4'
                  value={location}
                  onChange={setLocation}
                  label={meta.locationLabel}
                />
              </CreateSection>

              <CreateSection
                step={4}
                title='진행 기록'
                description='날짜별로 여러 건을 추가·수정·삭제할 수 있어요'
              >
                <JobReviewTimelineEditor
                  value={timeline}
                  onChange={setTimeline}
                  jobReviewType={jobReviewType}
                  mode='create'
                />
              </CreateSection>

              <CreateSection
                step={5}
                title='조심해야 할 점'
                description='다음 사람이 실수하지 않도록 꼭 알려주고 싶은 팁'
              >
                <TipTapEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder='예: 인터뷰 전에 팀의 최근 프로젝트를 꼭 찾아보세요. Handshake보다 LinkedIn referral 응답률이 높았습니다.'
                  minHeightClassName='min-h-[200px]'
                  contentClassName='!text-[13px] !leading-[1.65]'
                  simpleToolbar
                  maxLength={COMMUNITY_BODY_MAX}
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
                    위 커뮤니티 작성 안내를 확인했고, 실제 경험을 바탕으로 작성했어요.
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
                  disabled={submitting || !postTitle.trim() || !jobReviewType}
                  className='inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90 disabled:opacity-50 sm:h-12 sm:text-[15px]'
                >
                  {submitting
                    ? '등록 중…'
                    : !jobReviewType
                      ? '유형을 선택해 주세요'
                      : mode === 'member'
                        ? '후기 등록하기'
                        : '가입 없이 후기 등록하기'}
                </button>
              </WriteDraftActions>

              <p className='text-center text-[12px] text-[var(--muted)]'>
                {mode === 'guest' ? (
                  <>
                    가입은 필요 없어요.{' '}
                    <button
                      type='button'
                      onClick={() => {
                        setPhase('choose')
                        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
                      }}
                      className='font-medium text-[var(--brand)] underline-offset-2 hover:underline'
                    >
                      Google로 가입하고 남기기
                    </button>
                    를 고르면 크레딧이 계정에 바로 적립돼요.
                  </>
                ) : (
                  '등록 후에는 내 글에서 진행 기록을 이어서 추가·수정할 수 있어요.'
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
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        현직자 후기 남기기
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        가입 없이도 후기를 남길 수 있어요
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        서류부터 인터뷰, 결과까지 단계별로 남겨 주시면 같은 길을 준비하는
        후배들에게 큰 도움이 돼요. 5분이면 충분해요.
      </p>

      <CreditPitch />

      <div className='mt-6 space-y-3'>
        <section className='rounded-2xl bg-white p-4 ring-1 ring-[var(--brand)]/30 sm:p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
                추천
              </p>
              <h2 className='mt-1 text-[15px] font-semibold text-[var(--foreground)]'>
                Google로 가입하고 남기기
              </h2>
            </div>
          </div>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>크레딧이 내 계정에 바로 적립돼요</PitchItem>
            <PitchItem>등록 후에도 진행 기록을 이어서 추가할 수 있어요</PitchItem>
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
            가입 없이 남기기
          </h2>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>닉네임·이메일·LinkedIn 주소만 적으면 돼요</PitchItem>
            <PitchItem>
              크레딧은 보관해 두었다가, 나중에 같은 이메일로 가입하면 자동으로
              적립돼요
            </PitchItem>
          </ul>
          <button
            type='button'
            onClick={onGuest}
            className='mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white touch-manipulation transition hover:opacity-90'
          >
            가입 없이 후기 남기기
          </button>
        </section>
      </div>
    </div>
  )
}

function CreditPitch() {
  return (
    <div className='mt-5 rounded-2xl bg-[#fff8f5] p-4 ring-1 ring-[var(--brand)]/15 sm:p-5'>
      <p className='text-[12px] font-semibold text-[var(--brand)]'>
        후기를 남기면 크레딧이 쌓여요
      </p>
      <ul className='mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
        <PitchItem accent>
          채용 단계 1개당 {COMMUNITY_CREDIT_TIMELINE_ENTRY} 크레딧 (글당 최대{' '}
          {COMMUNITY_CREDIT_TIMELINE_POST_MAX})
          {FIRST_POST_BONUS > 0 ? ` · 첫 글 +${FIRST_POST_BONUS}` : ''}
        </PitchItem>
        <PitchItem accent>
          자세히 남겨 주신 후기는 미생팀 리뷰 후 추가 크레딧을 드려요
        </PitchItem>
        <PitchItem accent>
          모은 크레딧({COFFEE_CHAT_COST})으로 같은 업계·회사는 물론 다른 업계
          현직자와의 1:1 커피챗에 쓸 수 있어요
        </PitchItem>
        <PitchItem accent>
          가입은 선택이에요. 가입하면 크레딧 사용과 후배들의 커피챗 요청 수신이
          가능해져요
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
  return (
    <div>
      <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--muted)]'>
        {mode === 'member' ? '내 계정으로 남기기' : '가입 없이 남기기'}
      </p>
      <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.55rem]'>
        {writeLabel}
      </h1>
      <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
        {mode === 'member'
          ? '크레딧은 등록 즉시 이 계정에 적립돼요. 후배들의 커피챗 요청도 받아볼 수 있어요.'
          : '가입은 필요 없어요. 크레딧은 보관해 두었다가 나중에 같은 이메일로 가입하면 자동으로 적립돼요.'}
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
  const estimated = Math.min(
    timelineCount * COMMUNITY_CREDIT_TIMELINE_ENTRY,
    COMMUNITY_CREDIT_TIMELINE_POST_MAX,
  )
  return (
    <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fff8f5] px-4 py-3 text-[13px] ring-1 ring-[var(--brand)]/15'>
      <span className='text-[var(--muted-foreground)]'>
        지금까지 추가한 채용 단계 {timelineCount}건
      </span>
      <span className='font-semibold text-[var(--brand)]'>
        {mode === 'member' ? '적립 예정' : '가입 시 적립'} {estimated} 크레딧
        {FIRST_POST_BONUS > 0 ? ` (+첫 글 ${FIRST_POST_BONUS})` : ''}
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
  const postHref = hrefForCommunityPost(post, city)
  const linkedNow = credit.linked || (claim?.linkedCount ?? 0) > 0
  const awarded = credit.linked ? credit.awarded : claim?.creditAwarded ?? 0
  const pending = credit.estimated + credit.firstPostBonus

  return (
    <div>
      <div className='rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-6'>
        <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
          등록 완료
        </p>
        <h1 className='mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-[1.5rem]'>
          후기를 남겨 주셔서 감사해요
        </h1>
        <p className='mt-2 text-[13px] leading-relaxed text-[var(--muted)]'>
          「{post.title}」이(가) 면접·취업 게시판에 올라갔어요. 채용 단계{' '}
          {post.jobReviewTimeline.length}건이 후배들에게 공유돼요.
        </p>

        <div className='mt-4 rounded-xl bg-[#fff8f5] px-4 py-3.5 ring-1 ring-[var(--brand)]/15'>
          {linkedNow ? (
            <>
              <p className='text-[13px] font-semibold text-[var(--brand)]'>
                {awarded > 0
                  ? `${awarded} 크레딧이 계정에 적립됐어요`
                  : '후기가 계정에 연결됐어요'}
              </p>
              <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
                크레딧은 같은 업계·회사는 물론 다른 업계 현직자와의 커피챗
                ({COFFEE_CHAT_COST} 크레딧)에 쓸 수 있어요.
              </p>
            </>
          ) : (
            <>
              <p className='text-[13px] font-semibold text-[var(--brand)]'>
                가입하시면 {pending} 크레딧이 바로 적립돼요
              </p>
              <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
                채용 단계 {post.jobReviewTimeline.length}건 = {credit.estimated}{' '}
                크레딧
                {credit.firstPostBonus > 0 ? ` + 첫 글 보너스 ${credit.firstPostBonus}` : ''}
                . 후기에 적은 이메일과 같은 Google 계정으로 가입하면 자동으로
                연결돼요.
              </p>
            </>
          )}
        </div>

        <div className='mt-4 flex flex-col gap-2 sm:flex-row'>
          <Link
            href={postHref}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--foreground)] text-[14px] font-semibold text-white transition hover:opacity-90'
          >
            내 후기 보기
          </Link>
          <Link
            href={linkedNow ? creditHref : listHref}
            className='inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[var(--foreground)] ring-1 ring-black/[0.1] transition hover:bg-[#fafafa]'
          >
            {linkedNow ? '내 크레딧 보기' : '목록으로'}
          </Link>
        </div>
      </div>

      {!isMember && !linkedNow ? (
        <section className='mt-4 rounded-2xl bg-white p-5 ring-1 ring-[var(--brand)]/30 sm:p-6'>
          <p className='text-[11px] font-semibold tracking-[0.08em] text-[var(--brand)]'>
            선택 사항
          </p>
          <h2 className='mt-1 text-[16px] font-semibold text-[var(--foreground)]'>
            Misaeng에 가입하시면 후배들의 커피챗 요청을 받아보실 수 있어요
          </h2>
          <ul className='mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
            <PitchItem>방금 남긴 후기와 {pending} 크레딧이 계정에 바로 연결돼요</PitchItem>
            <PitchItem>
              크레딧으로 같은 업계·회사, 혹은 다른 업계 현직자와 1:1 커피챗을 할 수
              있어요
            </PitchItem>
            <PitchItem>진행 기록을 이어서 추가·수정할 수 있어요</PitchItem>
          </ul>
          {claim && claim.linkedCount === 0 ? (
            <p className='mt-3 rounded-xl bg-[#f4f5f7] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
              가입한 계정 이메일이 후기에 적은 이메일과 달라 자동으로 연결되지
              않았어요. 운영팀이 LinkedIn·이메일을 확인한 뒤 계정에 연결해
              드릴게요.
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
            지금 가입하지 않아도 후기는 그대로 게시돼요.{' '}
            <Link href={listHref} className='underline-offset-2 hover:underline'>
              나중에 할게요
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
    <section>
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
