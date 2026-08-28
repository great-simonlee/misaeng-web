import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  COMMUNITY_CREDIT_BONUS_RULES,
  COMMUNITY_CREDIT_EARN_EFFICIENCY,
  COMMUNITY_CREDIT_EARN_RULES,
  COMMUNITY_CREDIT_FAQ,
  COMMUNITY_CREDIT_GLOSSARY,
  COMMUNITY_CREDIT_LIMITS,
  COMMUNITY_CREDIT_NO_EARN,
  COMMUNITY_CREDIT_POLICY_VERSION,
  COMMUNITY_CREDIT_PRINCIPLES,
  COMMUNITY_CREDIT_REDEEM_OPTIONS,
  COMMUNITY_CREDIT_REDEEM_PROCESS,
  COMMUNITY_CREDIT_REVOCATION,
  COMMUNITY_CREDIT_WORKFLOW,
  commentDaysEquivalent,
  foodPostsEquivalent,
  premiumPostsEquivalent,
  type CommunityCreditRedeemOption,
} from '@lib/constants/communityCredit'
import { cn } from '@lib'

const TOC = [
  { id: 'redeem', label: '보상 신청' },
  { id: 'process', label: '신청 절차' },
  { id: 'earn', label: '적립 방법' },
  { id: 'principles', label: '원칙·흐름' },
  { id: 'limits', label: '한도·회수' },
  { id: 'faq', label: 'FAQ' },
] as const

export function CreditScreen() {
  const openOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((o) => !o.comingSoon)
  const comingSoonOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((o) => o.comingSoon)

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[#f4f5f7]'>
      <header className='border-b border-[var(--border)] bg-white'>
        <div className='mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8'>
          <p className='text-[11px] font-semibold tracking-[0.2em] text-[var(--muted)]'>
            MISAENG NYC
          </p>
          <h1 className='mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-[2rem]'>
            커뮤니티 크레딧 가이드
          </h1>
          <p className='mt-3 max-w-2xl text-[15px] leading-[1.65] text-[var(--muted-foreground)]'>
            커뮤니티에 기여해 쌓은 크레딧으로 커피챗·이민 변호사 자문 등 보상을
            신청할 수 있어요. 현금화는 불가하며, 학교 인증이 필요합니다.
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Tag>정수만 사용</Tag>
            <Tag>현금화 불가</Tag>
            <Tag>학교 인증 필수</Tag>
            <Tag muted>v{COMMUNITY_CREDIT_POLICY_VERSION}</Tag>
          </div>
        </div>
      </header>

      <div className='mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8'>
        <nav
          aria-label='목차'
          className='sticky top-14 z-10 -mx-1 rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:top-16 sm:px-5'
        >
          <ul className='flex flex-wrap gap-x-1 gap-y-1'>
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className='inline-flex rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--muted-foreground)] transition hover:bg-[#f4f5f7] hover:text-[var(--foreground)]'
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── 보상 신청 (맨 앞) ── */}
        <Section
          id='redeem'
          title='크레딧으로 신청할 수 있는 보상'
          description='모든 세션은 30분 이내로 진행됩니다. 필요 크레딧은 전문가·매칭 비용을 반영해 적립보다 높게 책정했습니다.'
          className='mt-8'
        >
          <div className='space-y-4'>
            {openOptions.map((option) => (
              <RedeemHeroCard key={option.id} option={option} featured />
            ))}
            {comingSoonOptions.length > 0 ? (
              <>
                <p className='pt-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]'>
                  준비 중
                </p>
                {comingSoonOptions.map((option) => (
                  <RedeemHeroCard key={option.id} option={option} />
                ))}
              </>
            ) : null}
          </div>

          <Callout className='mt-6'>
            보상 신청은 마이페이지에서 잔액 확인 후 순차 오픈됩니다. 커피챗·이민
            변호사 자문은 각각 월 1회까지 신청할 수 있어요.
          </Callout>
        </Section>

        <Section
          id='process'
          title='신청 절차'
          description='신청부터 세션 완료까지 4단계입니다.'
        >
          <WorkflowSteps steps={COMMUNITY_CREDIT_REDEEM_PROCESS} />
          <p className='mt-4 text-[13px] leading-relaxed text-[var(--muted)]'>
            매칭 전 취소는 크레딧 전액 복구를 원칙으로 합니다. 일정 확정 후
            당일 취소·노쇼는 반환되지 않을 수 있습니다.
          </p>
        </Section>

        {/* ── 적립 ── */}
        <Section
          id='earn'
          title='크레딧 적립'
          description='학교 이메일 인증 후, 아래 활동에 크레딧이 쌓입니다.'
        >
          <div className='overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
            <table className='w-full text-left'>
              <thead>
                <tr className='border-b border-black/[0.06] bg-[#fafbfc]'>
                  <th className='px-4 py-3 text-[12px] font-semibold text-[var(--muted)] sm:px-5'>
                    활동
                  </th>
                  <th className='px-4 py-3 text-right text-[12px] font-semibold text-[var(--muted)] sm:px-5'>
                    적립
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-black/[0.05]'>
                {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
                  <tr key={rule.id}>
                    <td className='px-4 py-3.5 sm:px-5'>
                      <p className='text-[14px] font-medium text-[var(--foreground)]'>
                        {rule.label}
                        {rule.boardId ? (
                          <Link
                            href={`/nyc/${rule.boardId}`}
                            className='ml-2 text-[12px] font-normal text-[var(--brand)] hover:underline'
                          >
                            →
                          </Link>
                        ) : null}
                      </p>
                      <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
                        {rule.unitLabel
                          ? `${rule.unitLabel}${rule.maxAmount ? ` · 최대 ${rule.maxAmount}` : ''}`
                          : rule.description.slice(0, 60)}
                        …
                      </p>
                    </td>
                    <td className='px-4 py-3.5 text-right sm:px-5'>
                      <span className='text-[16px] font-bold tabular-nums text-[var(--brand)]'>
                        +{rule.amount}
                      </span>
                      {rule.maxAmount ? (
                        <span className='block text-[11px] text-[var(--muted)]'>
                          최대 {rule.maxAmount}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {COMMUNITY_CREDIT_BONUS_RULES.map((bonus) => (
                  <tr key={bonus.id} className='bg-[#fffbf9]'>
                    <td className='px-4 py-3.5 sm:px-5'>
                      <p className='text-[14px] font-medium text-[var(--foreground)]'>
                        {bonus.label}
                        <span className='ml-1.5 text-[11px] font-normal text-[var(--muted)]'>
                          1회
                        </span>
                      </p>
                    </td>
                    <td className='px-4 py-3.5 text-right sm:px-5'>
                      <span className='text-[16px] font-bold tabular-nums text-[var(--brand)]'>
                        +{bonus.amount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className='group mt-4 rounded-2xl bg-white ring-1 ring-black/[0.06]'>
            <summary className='cursor-pointer list-none px-4 py-4 text-[14px] font-semibold text-[var(--foreground)] sm:px-5 [&::-webkit-details-marker]:hidden'>
              적립 조건·효율 자세히 보기
              <span className='ml-2 text-[12px] font-normal text-[var(--muted)] group-open:hidden'>
                ▼
              </span>
              <span className='ml-2 hidden text-[12px] font-normal text-[var(--muted)] group-open:inline'>
                ▲
              </span>
            </summary>
            <div className='space-y-4 border-t border-black/[0.05] px-4 pb-5 pt-2 sm:px-5'>
              {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
                <EarnRuleCompact key={rule.id} rule={rule} />
              ))}
              <div className='overflow-hidden rounded-xl ring-1 ring-black/[0.05]'>
                <table className='w-full text-left text-[13px]'>
                  <thead>
                    <tr className='bg-[#fafbfc] text-[11px] font-semibold text-[var(--muted)]'>
                      <th className='px-3 py-2'>활동</th>
                      <th className='px-3 py-2 text-right'>적립</th>
                      <th className='hidden px-3 py-2 sm:table-cell'>커피챗</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-black/[0.05]'>
                    {COMMUNITY_CREDIT_EARN_EFFICIENCY.map((row) => (
                      <tr key={row.activity}>
                        <td className='px-3 py-2.5'>{row.activity}</td>
                        <td className='px-3 py-2.5 text-right tabular-nums'>
                          +{row.amount}/{row.unit}
                        </td>
                        <td className='hidden px-3 py-2.5 text-[var(--muted)] sm:table-cell'>
                          {row.toCoffeeChat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className='space-y-1 text-[13px] text-[var(--muted-foreground)]'>
                {COMMUNITY_CREDIT_NO_EARN.map((line) => (
                  <li key={line} className='flex gap-2'>
                    <span className='text-[var(--muted)]'>×</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </Section>

        <Section
          id='principles'
          title='원칙 · 이용 흐름'
          description='프로그램의 기본 원칙과 처음부터 보상까지의 흐름입니다.'
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            {COMMUNITY_CREDIT_PRINCIPLES.map((item) => (
              <div
                key={item.title}
                className='rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.06] sm:px-5'
              >
                <h3 className='text-[14px] font-semibold text-[var(--foreground)]'>
                  {item.title}
                </h3>
                <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <div className='mt-5 rounded-2xl bg-white px-4 py-5 ring-1 ring-black/[0.06] sm:px-5'>
            <p className='mb-4 text-[13px] font-semibold text-[var(--foreground)]'>
              이용 흐름
            </p>
            <WorkflowSteps steps={COMMUNITY_CREDIT_WORKFLOW} />
          </div>
        </Section>

        <Section
          id='limits'
          title='한도 · 회수'
          description='공정한 운영을 위한 규칙입니다.'
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <InfoBlock title='적립'>
              <ul className='space-y-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                <li>
                  댓글·답글: 하루 최대{' '}
                  <strong className='text-[var(--foreground)]'>
                    {COMMUNITY_CREDIT_LIMITS.commentDailyCap}
                  </strong>
                  크레딧
                </li>
                <li>본인 글·댓글에 단 답글: 적립 없음</li>
                <li>글·댓글 삭제 시 해당 적립분 회수</li>
                <li>1회 보너스: 계정당 1회</li>
              </ul>
            </InfoBlock>
            <InfoBlock title='사용'>
              <ul className='space-y-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                {openOptions.map((option) => (
                  <li key={option.id}>
                    {option.label}: 월{' '}
                    <strong className='text-[var(--foreground)]'>
                      {option.monthlyCap}회
                    </strong>
                    · {option.duration}
                  </li>
                ))}
                <li>
                  신청 전 최근 {COMMUNITY_CREDIT_LIMITS.recentActivityDays}일
                  내 활동 1회 이상 권장
                </li>
              </ul>
            </InfoBlock>
          </div>
          <ul className='mt-4 space-y-2'>
            {COMMUNITY_CREDIT_REVOCATION.map((line) => (
              <li
                key={line}
                className='rounded-xl bg-white px-4 py-3 text-[13px] text-[var(--muted-foreground)] ring-1 ring-black/[0.05]'
              >
                {line}
              </li>
            ))}
          </ul>
        </Section>

        <Section id='faq' title='자주 묻는 질문'>
          <dl className='space-y-2'>
            {COMMUNITY_CREDIT_FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </dl>
        </Section>

        <details className='mt-10 rounded-2xl bg-white ring-1 ring-black/[0.06]'>
          <summary className='cursor-pointer list-none px-4 py-4 text-[14px] font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
            용어 정리
          </summary>
          <dl className='space-y-2 border-t border-black/[0.05] px-4 pb-5 pt-3 sm:px-5'>
            {COMMUNITY_CREDIT_GLOSSARY.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} compact flat />
            ))}
          </dl>
        </details>

        <footer className='mt-12 rounded-2xl bg-white px-5 py-6 ring-1 ring-black/[0.06] sm:px-6'>
          <p className='text-[12px] leading-relaxed text-[var(--muted)]'>
            이민 변호사 자문은 정보 제공 목적이며, 개별 사건 대리와는
            별개입니다. 정책은 사전 고지 후 변경될 수 있습니다.
          </p>
          <div className='mt-5 flex flex-wrap gap-2'>
            <Link
              href='/nyc/me'
              className='inline-flex h-10 items-center rounded-full bg-[var(--brand)] px-5 text-[13px] font-semibold text-white touch-manipulation'
            >
              마이페이지
            </Link>
            <Link
              href='/nyc/food/new'
              className='inline-flex h-10 items-center rounded-full border border-[var(--border)] px-5 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation'
            >
              맛집 후기 쓰기
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('mt-12 scroll-mt-24', className)}>
      <h2 className='text-[1.2rem] font-bold tracking-tight text-[var(--foreground)] sm:text-[1.35rem]'>
        {title}
      </h2>
      {description ? (
        <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
          {description}
        </p>
      ) : null}
      <div className='mt-5'>{children}</div>
    </section>
  )
}

function Tag({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
        muted
          ? 'bg-[#eef0f3] text-[var(--muted)]'
          : 'bg-[#fff0eb] text-[var(--brand)]',
      )}
    >
      {children}
    </span>
  )
}

function RedeemHeroCard({
  option,
  featured = false,
}: {
  option: CommunityCreditRedeemOption
  featured?: boolean
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]',
        featured && 'ring-[#F64310]/20',
        option.comingSoon && 'opacity-90',
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4 px-5 py-5',
          featured ? 'bg-[linear-gradient(135deg,#fff7f4_0%,#ffffff_70%)]' : '',
        )}
      >
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-[17px] font-bold tracking-tight text-[var(--foreground)]'>
              {option.label}
            </h3>
            {option.comingSoon ? (
              <span className='rounded-full bg-[#eef0f3] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]'>
                준비 중
              </span>
            ) : (
              <span className='rounded-full bg-[#fff0eb] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]'>
                신청 예정
              </span>
            )}
          </div>
          <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
            {option.description}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <MetaPill>{option.duration}</MetaPill>
            <MetaPill>월 {option.monthlyCap}회</MetaPill>
            {!option.comingSoon ? (
              <MetaPill>
                ≈ 맛집 {foodPostsEquivalent(option.cost)}편
              </MetaPill>
            ) : null}
          </div>
        </div>
        <div className='text-right'>
          <p className='text-[2rem] font-bold tabular-nums leading-none text-[var(--brand)]'>
            {option.cost}
          </p>
          <p className='mt-1 text-[12px] font-medium text-[var(--muted)]'>
            크레딧
          </p>
        </div>
      </div>

      <div className='grid gap-4 border-t border-black/[0.05] px-5 py-4 sm:grid-cols-2'>
        <DetailList title='포함' items={option.includes} positive />
        <DetailList title='포함되지 않음' items={option.excludes} />
      </div>

      {option.note ? (
        <p className='border-t border-black/[0.05] bg-[#fafbfc] px-5 py-3 text-[12px] leading-relaxed text-[var(--muted)]'>
          {option.note}
        </p>
      ) : null}
    </article>
  )
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className='inline-flex rounded-lg bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]'>
      {children}
    </span>
  )
}

function WorkflowSteps({
  steps,
}: {
  steps: readonly { step: number; title: string; description: string }[]
}) {
  return (
    <ol className='space-y-4'>
      {steps.map((item) => (
        <li key={item.step} className='flex gap-3'>
          <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[12px] font-bold text-white'>
            {item.step}
          </span>
          <div className='min-w-0 pt-0.5'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>
              {item.title}
            </p>
            <p className='mt-0.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
              {item.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function EarnRuleCompact({
  rule,
}: {
  rule: (typeof COMMUNITY_CREDIT_EARN_RULES)[number]
}) {
  return (
    <div className='rounded-xl bg-[#fafbfc] px-4 py-3'>
      <p className='text-[14px] font-semibold text-[var(--foreground)]'>
        {rule.label}{' '}
        <span className='font-bold text-[var(--brand)]'>+{rule.amount}</span>
        {rule.maxAmount ? (
          <span className='text-[12px] font-normal text-[var(--muted)]'>
            {' '}
            (최대 {rule.maxAmount})
          </span>
        ) : null}
      </p>
      <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
        {rule.description}
      </p>
    </div>
  )
}

function DetailList({
  title,
  items,
  positive = false,
}: {
  title: string
  items: string[]
  positive?: boolean
}) {
  return (
    <div>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]'>
        {title}
      </p>
      <ul className='mt-2 space-y-1.5'>
        {items.map((line) => (
          <li
            key={line}
            className='flex gap-2 text-[13px] leading-snug text-[var(--muted-foreground)]'
          >
            <span
              className={cn(
                'shrink-0',
                positive ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
              )}
            >
              {positive ? '✓' : '×'}
            </span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InfoBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className='rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.06] sm:px-5'>
      <p className='text-[13px] font-semibold text-[var(--foreground)]'>
        {title}
      </p>
      <div className='mt-3'>{children}</div>
    </div>
  )
}

function Callout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#F64310]/12 bg-[#fff7f4] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function FaqItem({
  q,
  a,
  compact = false,
  flat = false,
}: {
  q: string
  a: string
  compact?: boolean
  flat?: boolean
}) {
  return (
    <div
      className={cn(
        !flat && 'rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.06] sm:px-5',
        flat && 'py-2',
      )}
    >
      <dt
        className={cn(
          'font-semibold text-[var(--foreground)]',
          compact ? 'text-[13px]' : 'text-[14px]',
        )}
      >
        {q}
      </dt>
      <dd className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
        {a}
      </dd>
    </div>
  )
}
