'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'

import { useCityPath } from '@hooks/useCity'

import { BRAND_CONFIG } from '@lib/brand'
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
  communityCreditMessageParams,
  foodPostsEquivalent,
  type CommunityCreditRedeemOption,
} from '@lib/constants/communityCredit'
import { useFormat, useT } from '@lib/i18n/client'
import type { Translate, TranslateParams } from '@lib/i18n/translate'
import { cn } from '@lib'

const TOC = ['redeem', 'process', 'earn', 'principles', 'limits', 'faq'] as const

/** `{token}` 자리에 React 노드(강조 등)를 넣는다. 나머지 자리는 t()가 이미 채운 문자열 */
function withNode(text: string, token: string, node: ReactNode): ReactNode {
  const [before, ...rest] = text.split(`{${token}}`)
  if (rest.length === 0) return text
  return (
    <>
      {before}
      {node}
      {rest.join(`{${token}}`)}
    </>
  )
}

/** 크레딧 문구의 숫자 자리 값 (현재 언어 숫자 표기) */
function useCreditParams(): TranslateParams {
  const format = useFormat()
  return useMemo(() => {
    const params: TranslateParams = { brand: BRAND_CONFIG.name }
    for (const [key, value] of Object.entries(communityCreditMessageParams())) {
      params[key] = format.number(value)
    }
    return params
  }, [format])
}

export function CreditScreen() {
  const href = useCityPath()
  const t = useT('credit')
  const format = useFormat()
  const params = useCreditParams()
  const openOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((o) => !o.comingSoon)
  const comingSoonOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((o) => o.comingSoon)

  return (
    <div className='min-h-screen min-w-0 overflow-x-hidden bg-[#f4f5f7]'>
      <header className='border-b border-[var(--border)] bg-white'>
        <div className='mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8'>
          <p className='text-[11px] font-semibold tracking-[0.2em] text-[var(--muted)]'>
            {t('header.eyebrow', { brand: BRAND_CONFIG.name.toUpperCase() })}
          </p>
          <h1 className='mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-[2rem]'>
            {t('header.title')}
          </h1>
          <p className='mt-3 max-w-2xl text-[15px] leading-[1.65] text-[var(--muted-foreground)]'>
            {t('header.intro')}
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Tag>{t('header.tagInteger')}</Tag>
            <Tag>{t('header.tagNoCash')}</Tag>
            <Tag>{t('header.tagVerification')}</Tag>
            <Tag muted>
              {t('header.policyVersion', { version: COMMUNITY_CREDIT_POLICY_VERSION })}
            </Tag>
          </div>
        </div>
      </header>

      <div className='mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8'>
        <nav
          aria-label={t('toc.aria')}
          className='sticky top-14 z-10 -mx-1 rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:top-16 sm:px-5'
        >
          <ul className='flex flex-wrap gap-x-1 gap-y-1'>
            {TOC.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className='inline-flex rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--muted-foreground)] transition hover:bg-[#f4f5f7] hover:text-[var(--foreground)]'
                >
                  {t(`toc.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── 보상 신청 (맨 앞) ── */}
        <Section
          id='redeem'
          title={t('redeem.title')}
          description={t('redeem.description')}
          className='mt-8'
        >
          <div className='space-y-4'>
            {openOptions.map((option) => (
              <RedeemHeroCard key={option.id} option={option} featured />
            ))}
            {comingSoonOptions.length > 0 ? (
              <>
                <p className='pt-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]'>
                  {t('redeem.comingSoon')}
                </p>
                {comingSoonOptions.map((option) => (
                  <RedeemHeroCard key={option.id} option={option} />
                ))}
              </>
            ) : null}
          </div>

          <Callout className='mt-6'>{t('redeem.callout')}</Callout>
        </Section>

        <Section
          id='process'
          title={t('process.title')}
          description={t('process.description')}
        >
          <WorkflowSteps group='redeemProcess' steps={COMMUNITY_CREDIT_REDEEM_PROCESS} />
          <p className='mt-4 text-[13px] leading-relaxed text-[var(--muted)]'>
            {t('process.cancelNote')}
          </p>
        </Section>

        {/* ── 적립 ── */}
        <Section
          id='earn'
          title={t('earn.title')}
          description={t('earn.description')}
        >
          <div className='overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]'>
            <table className='w-full text-left'>
              <thead>
                <tr className='border-b border-black/[0.06] bg-[#fafbfc]'>
                  <th className='px-4 py-3 text-[12px] font-semibold text-[var(--muted)] sm:px-5'>
                    {t('earn.colActivity')}
                  </th>
                  <th className='px-4 py-3 text-right text-[12px] font-semibold text-[var(--muted)] sm:px-5'>
                    {t('earn.colEarn')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-black/[0.05]'>
                {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
                  <tr key={rule.id}>
                    <td className='px-4 py-3.5 sm:px-5'>
                      <p className='text-[14px] font-medium text-[var(--foreground)]'>
                        {t(`earnRules.${rule.id}.label`)}
                        {rule.boardId ? (
                          <Link
                            href={href(`/${rule.boardId}`)}
                            className='ml-2 text-[12px] font-normal text-[var(--brand)] hover:underline'
                          >
                            →
                          </Link>
                        ) : null}
                      </p>
                      <p className='mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]'>
                        {rule.hasUnitLabel
                          ? rule.maxAmount
                            ? t('earn.unitWithMax', {
                                unit: t(`earnRules.${rule.id}.unitLabel`),
                                amount: format.number(rule.maxAmount),
                              })
                            : t(`earnRules.${rule.id}.unitLabel`)
                          : t(`earnRules.${rule.id}.description`, params).slice(0, 60)}
                        …
                      </p>
                    </td>
                    <td className='px-4 py-3.5 text-right sm:px-5'>
                      <span className='text-[16px] font-bold tabular-nums text-[var(--brand)]'>
                        +{format.number(rule.amount)}
                      </span>
                      {rule.maxAmount ? (
                        <span className='block text-[11px] text-[var(--muted)]'>
                          {t('earn.max', { amount: format.number(rule.maxAmount) })}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {COMMUNITY_CREDIT_BONUS_RULES.map((bonus) => (
                  <tr key={bonus.id} className='bg-[#fffbf9]'>
                    <td className='px-4 py-3.5 sm:px-5'>
                      <p className='text-[14px] font-medium text-[var(--foreground)]'>
                        {t(`bonusRules.${bonus.id}.label`)}
                        <span className='ml-1.5 text-[11px] font-normal text-[var(--muted)]'>
                          {t('earn.once')}
                        </span>
                      </p>
                    </td>
                    <td className='px-4 py-3.5 text-right sm:px-5'>
                      <span className='text-[16px] font-bold tabular-nums text-[var(--brand)]'>
                        +{format.number(bonus.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className='group mt-4 rounded-2xl bg-white ring-1 ring-black/[0.06]'>
            <summary className='cursor-pointer list-none px-4 py-4 text-[14px] font-semibold text-[var(--foreground)] sm:px-5 [&::-webkit-details-marker]:hidden'>
              {t('earn.detailsToggle')}
              <span className='ml-2 text-[12px] font-normal text-[var(--muted)] group-open:hidden'>
                ▼
              </span>
              <span className='ml-2 hidden text-[12px] font-normal text-[var(--muted)] group-open:inline'>
                ▲
              </span>
            </summary>
            <div className='space-y-4 border-t border-black/[0.05] px-4 pb-5 pt-2 sm:px-5'>
              {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
                <EarnRuleCompact key={rule.id} rule={rule} t={t} params={params} />
              ))}
              <div className='overflow-hidden rounded-xl ring-1 ring-black/[0.05]'>
                <table className='w-full text-left text-[13px]'>
                  <thead>
                    <tr className='bg-[#fafbfc] text-[11px] font-semibold text-[var(--muted)]'>
                      <th className='px-3 py-2'>{t('earn.colActivity')}</th>
                      <th className='px-3 py-2 text-right'>{t('earn.colEarn')}</th>
                      <th className='hidden px-3 py-2 sm:table-cell'>
                        {t('earn.colCoffeeChat')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-black/[0.05]'>
                    {COMMUNITY_CREDIT_EARN_EFFICIENCY.map((row) => (
                      <tr key={row.id}>
                        <td className='px-3 py-2.5'>{t(`efficiency.${row.id}.activity`)}</td>
                        <td className='px-3 py-2.5 text-right tabular-nums'>
                          {t('earn.perUnit', {
                            amount: format.number(row.amount),
                            unit: t(`efficiency.${row.id}.unit`),
                          })}
                        </td>
                        <td className='hidden px-3 py-2.5 text-[var(--muted)] sm:table-cell'>
                          {t(`efficiency.${row.id}.toCoffeeChat`, {
                            ...params,
                            count: row.toCoffeeChat,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className='space-y-1 text-[13px] text-[var(--muted-foreground)]'>
                {COMMUNITY_CREDIT_NO_EARN.map((id) => (
                  <li key={id} className='flex gap-2'>
                    <span className='text-[var(--muted)]'>×</span>
                    {t(`noEarn.${id}`)}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </Section>

        <Section
          id='principles'
          title={t('principlesSection.title')}
          description={t('principlesSection.description')}
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            {COMMUNITY_CREDIT_PRINCIPLES.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl bg-white px-4 py-4 ring-1 ring-black/[0.06] sm:px-5'
              >
                <h3 className='text-[14px] font-semibold text-[var(--foreground)]'>
                  {t(`principles.${item.id}.title`)}
                </h3>
                <p className='mt-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                  {t(`principles.${item.id}.body`)}
                </p>
              </div>
            ))}
          </div>
          <div className='mt-5 rounded-2xl bg-white px-4 py-5 ring-1 ring-black/[0.06] sm:px-5'>
            <p className='mb-4 text-[13px] font-semibold text-[var(--foreground)]'>
              {t('principlesSection.flowTitle')}
            </p>
            <WorkflowSteps group='workflow' steps={COMMUNITY_CREDIT_WORKFLOW} />
          </div>
        </Section>

        <Section
          id='limits'
          title={t('limits.title')}
          description={t('limits.description')}
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <InfoBlock title={t('limits.earnTitle')}>
              <ul className='space-y-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                <li>
                  {withNode(
                    t('limits.commentCap'),
                    'amount',
                    <strong className='text-[var(--foreground)]'>
                      {format.number(COMMUNITY_CREDIT_LIMITS.commentDailyCap)}
                    </strong>,
                  )}
                </li>
                <li>{t('limits.noSelfReply')}</li>
                <li>{t('limits.revokeOnDelete')}</li>
                <li>{t('limits.oncePerAccount')}</li>
              </ul>
            </InfoBlock>
            <InfoBlock title={t('limits.spendTitle')}>
              <ul className='space-y-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                {openOptions.map((option) => (
                  <li key={option.id}>
                    {withNode(
                      t('limits.optionCap', {
                        label: t(`redeemOptions.${option.id}.label`),
                        duration: t(`redeemOptions.${option.id}.duration`),
                      }),
                      'cap',
                      <strong className='text-[var(--foreground)]'>
                        {t('limits.times', { count: option.monthlyCap })}
                      </strong>,
                    )}
                  </li>
                ))}
                <li>
                  {t('limits.recentActivity', {
                    days: format.number(COMMUNITY_CREDIT_LIMITS.recentActivityDays),
                  })}
                </li>
              </ul>
            </InfoBlock>
          </div>
          <ul className='mt-4 space-y-2'>
            {COMMUNITY_CREDIT_REVOCATION.map((id) => (
              <li
                key={id}
                className='rounded-xl bg-white px-4 py-3 text-[13px] text-[var(--muted-foreground)] ring-1 ring-black/[0.05]'
              >
                {t(`revocation.${id}`)}
              </li>
            ))}
          </ul>
        </Section>

        <Section id='faq' title={t('faqSection.title')}>
          <dl className='space-y-2'>
            {COMMUNITY_CREDIT_FAQ.map((id) => (
              <FaqItem
                key={id}
                q={t(`faq.${id}.q`, params)}
                a={t(`faq.${id}.a`, params)}
              />
            ))}
          </dl>
        </Section>

        <details className='mt-10 rounded-2xl bg-white ring-1 ring-black/[0.06]'>
          <summary className='cursor-pointer list-none px-4 py-4 text-[14px] font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
            {t('faqSection.glossaryTitle')}
          </summary>
          <dl className='space-y-2 border-t border-black/[0.05] px-4 pb-5 pt-3 sm:px-5'>
            {COMMUNITY_CREDIT_GLOSSARY.map((id) => (
              <FaqItem
                key={id}
                q={t(`glossary.${id}.term`)}
                a={t(`glossary.${id}.definition`, params)}
                compact
                flat
              />
            ))}
          </dl>
        </details>

        <footer className='mt-12 rounded-2xl bg-white px-5 py-6 ring-1 ring-black/[0.06] sm:px-6'>
          <p className='text-[12px] leading-relaxed text-[var(--muted)]'>
            {t('footer.disclaimer')}
          </p>
          <div className='mt-5 flex flex-wrap gap-2'>
            <Link
              href={href('/me')}
              className='inline-flex h-10 items-center rounded-full bg-[var(--brand)] px-5 text-[13px] font-semibold text-white touch-manipulation'
            >
              {t('footer.myPage')}
            </Link>
            <Link
              href={href('/food/new')}
              className='inline-flex h-10 items-center rounded-full border border-[var(--border)] px-5 text-[13px] font-semibold text-[var(--foreground)] touch-manipulation'
            >
              {t('footer.writeFood')}
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
          : 'bg-brand-subtle text-[var(--brand)]',
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
  const t = useT('credit')
  const format = useFormat()
  const base = `redeemOptions.${option.id}`
  const params = { cost: format.number(option.cost) }
  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]',
        featured && 'ring-brand/20',
        option.comingSoon && 'opacity-90',
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4 px-5 py-5',
          featured ? 'bg-[linear-gradient(135deg,var(--brand-soft)_0%,#ffffff_70%)]' : '',
        )}
      >
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-[17px] font-bold tracking-tight text-[var(--foreground)]'>
              {t(`${base}.label`)}
            </h3>
            {option.comingSoon ? (
              <span className='rounded-full bg-[#eef0f3] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]'>
                {t('redeem.comingSoon')}
              </span>
            ) : (
              <span className='rounded-full bg-brand-subtle px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]'>
                {t('redeem.applySoon')}
              </span>
            )}
          </div>
          <p className='mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]'>
            {t(`${base}.description`)}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <MetaPill>{t(`${base}.duration`)}</MetaPill>
            <MetaPill>{t('redeem.monthlyCap', { count: option.monthlyCap })}</MetaPill>
            {!option.comingSoon ? (
              <MetaPill>
                {t('redeem.foodEquivalent', { count: foodPostsEquivalent(option.cost) })}
              </MetaPill>
            ) : null}
          </div>
        </div>
        <div className='text-right'>
          <p className='text-[2rem] font-bold tabular-nums leading-none text-[var(--brand)]'>
            {format.number(option.cost)}
          </p>
          <p className='mt-1 text-[12px] font-medium text-[var(--muted)]'>
            {t('redeem.credits')}
          </p>
        </div>
      </div>

      <div className='grid gap-4 border-t border-black/[0.05] px-5 py-4 sm:grid-cols-2'>
        <DetailList
          title={t('redeem.includes')}
          items={option.includes.map((id) => t(`${base}.includes.${id}`, params))}
          positive
        />
        <DetailList
          title={t('redeem.excludes')}
          items={option.excludes.map((id) => t(`${base}.excludes.${id}`, params))}
        />
      </div>

      {option.hasNote ? (
        <p className='border-t border-black/[0.05] bg-[#fafbfc] px-5 py-3 text-[12px] leading-relaxed text-[var(--muted)]'>
          {t(`${base}.note`)}
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
  group,
  steps,
}: {
  group: 'workflow' | 'redeemProcess'
  steps: readonly { step: number; id: string }[]
}) {
  const t = useT('credit')
  const format = useFormat()
  return (
    <ol className='space-y-4'>
      {steps.map((item) => (
        <li key={item.step} className='flex gap-3'>
          <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[12px] font-bold text-white'>
            {format.number(item.step)}
          </span>
          <div className='min-w-0 pt-0.5'>
            <p className='text-[14px] font-semibold text-[var(--foreground)]'>
              {t(`${group}.${item.id}.title`)}
            </p>
            <p className='mt-0.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
              {t(`${group}.${item.id}.description`)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function EarnRuleCompact({
  rule,
  t,
  params,
}: {
  rule: (typeof COMMUNITY_CREDIT_EARN_RULES)[number]
  t: Translate
  params: TranslateParams
}) {
  const format = useFormat()
  return (
    <div className='rounded-xl bg-[#fafbfc] px-4 py-3'>
      <p className='text-[14px] font-semibold text-[var(--foreground)]'>
        {t(`earnRules.${rule.id}.label`)}{' '}
        <span className='font-bold text-[var(--brand)]'>+{format.number(rule.amount)}</span>
        {rule.maxAmount ? (
          <span className='text-[12px] font-normal text-[var(--muted)]'>
            {' '}
            {t('earn.maxParen', { amount: format.number(rule.maxAmount) })}
          </span>
        ) : null}
      </p>
      <p className='mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]'>
        {t(`earnRules.${rule.id}.description`, params)}
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
        'rounded-2xl border border-brand/12 bg-brand-soft px-4 py-3.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]',
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
