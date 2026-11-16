'use client'

import { AlertIcon, BanIcon, ChatIcon, CompassIcon, GiftIcon, ShieldCheckIcon, SparkleIcon, StarIcon, UsersIcon } from '@widgets/ellieo/icons'
import { EllieoIconBadge } from '@widgets/ellieo/EllieoIconBadge'
import Link from 'next/link'
import { useMemo, type ComponentType, type CSSProperties, type ReactNode } from 'react'

import { useCityPath } from '@hooks/useCity'
import { cn } from '@lib'
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
import type { TranslateParams } from '@lib/i18n/translate'

/**
 * Ellieo points guide: same rules, numbers and copy as the Misaeng page (screens/credit/CreditScreen), drawn in the
 * Ellieo feed style — blue hero card, chip contents row, every section a card with a line icon, earn rules as rows with
 * blue point pills, FAQ as tap-to-open cards.
 */
const TOC = [
  { id: 'redeem', icon: GiftIcon },
  { id: 'process', icon: CompassIcon },
  { id: 'earn', icon: SparkleIcon },
  { id: 'principles', icon: UsersIcon },
  { id: 'limits', icon: ShieldCheckIcon },
  { id: 'faq', icon: ChatIcon },
] as const

function useCreditParams(): TranslateParams {
  const format = useFormat()
  return useMemo(() => {
    const params: TranslateParams = { brand: BRAND_CONFIG.name }
    for (const [key, value] of Object.entries(communityCreditMessageParams())) params[key] = format.number(value)
    return params
  }, [format])
}

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

export function EllieoCreditScreen() {
  const href = useCityPath()
  const t = useT('credit')
  const format = useFormat()
  const params = useCreditParams()
  const openOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((option) => !option.comingSoon)
  const comingSoonOptions = COMMUNITY_CREDIT_REDEEM_OPTIONS.filter((option) => option.comingSoon)
  const icon = (id: (typeof TOC)[number]['id']) => TOC.find((item) => item.id === id)!.icon

  return (
    <div className='min-w-0 flex-1 bg-white'>
      <div className='mx-auto w-full max-w-[40rem] px-4 pb-14 pt-5'>
        {/* Hero */}
        <header className='relative overflow-hidden rounded-[1.75rem] bg-[var(--brand)] px-5 pb-5 pt-5 text-white sm:px-6'>
          <span aria-hidden className='absolute -right-8 -top-10 size-32 rounded-full bg-white/10' />
          <EllieoIconBadge icon={StarIcon} size={56} className='absolute right-5 top-6' />
          <span className='relative inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-bold'>
            {t('header.eyebrow', { brand: BRAND_CONFIG.name.toUpperCase() })}
          </span>
          <h1 className='relative mt-3 max-w-[17rem] text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] sm:max-w-none sm:text-[32px]'>
            {t('header.title')}
          </h1>
          <p className='relative mt-2 text-[14.5px] leading-relaxed text-white/85'>{t('header.intro')}</p>
          <div className='relative mt-4 flex flex-wrap gap-1.5'>
            {[t('header.tagInteger'), t('header.tagNoCash'), t('header.tagVerification')].map((tag) => (
              <span key={tag} className='rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold'>
                {tag}
              </span>
            ))}
            <span className='rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-[var(--brand)]'>
              {t('header.policyVersion', { version: COMMUNITY_CREDIT_POLICY_VERSION })}
            </span>
          </div>
        </header>

        {/* Contents */}
        <nav aria-label={t('toc.aria')} className='sticky top-14 z-10 -mx-4 mt-4 bg-white/95 px-4 py-2.5 backdrop-blur sm:top-16'>
          <ul className='flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {TOC.map((item) => (
              <li key={item.id} className='shrink-0'>
                <a
                  href={`#${item.id}`}
                  className='inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3.5 text-[13.5px] font-semibold text-[var(--foreground)] hover:bg-[var(--border)]'
                >
                  <item.icon className='size-4 text-[var(--muted-foreground)]' />
                  {t(`toc.${item.id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Card id='redeem' icon={icon('redeem')} title={t('redeem.title')} description={t('redeem.description')}>
          <div className='space-y-3'>
            {openOptions.map((option) => (
              <RedeemOption key={option.id} option={option} />
            ))}
            {comingSoonOptions.length > 0 ? (
              <>
                <p className='pt-1 text-[12.5px] font-bold text-[var(--muted)]'>{t('redeem.comingSoon')}</p>
                {comingSoonOptions.map((option) => (
                  <RedeemOption key={option.id} option={option} />
                ))}
              </>
            ) : null}
          </div>
          <p className='mt-4 rounded-[1.125rem] bg-[var(--brand-soft)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--brand-deep)]'>
            {t('redeem.callout')}
          </p>
        </Card>

        <Card id='process' icon={icon('process')} title={t('process.title')} description={t('process.description')}>
          <Steps group='redeemProcess' steps={COMMUNITY_CREDIT_REDEEM_PROCESS} />
          <p className='mt-4 text-[13px] leading-relaxed text-[var(--muted)]'>{t('process.cancelNote')}</p>
        </Card>

        <Card id='earn' icon={icon('earn')} title={t('earn.title')} description={t('earn.description')}>
          <ul className='space-y-2'>
            {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
              <li key={rule.id} className='flex items-center gap-3 rounded-[1.125rem] bg-[var(--surface)] px-4 py-3'>
                <div className='min-w-0 flex-1'>
                  <p className='text-[14.5px] font-bold text-[var(--foreground)]'>
                    {rule.boardId ? (
                      <Link href={href(`/${rule.boardId}`)} className='hover:text-[var(--brand)]'>
                        {t(`earnRules.${rule.id}.label`)}
                      </Link>
                    ) : (
                      t(`earnRules.${rule.id}.label`)
                    )}
                  </p>
                  <p className='mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--muted-foreground)]'>
                    {rule.hasUnitLabel
                      ? rule.maxAmount
                        ? t('earn.unitWithMax', { unit: t(`earnRules.${rule.id}.unitLabel`), amount: format.number(rule.maxAmount) })
                        : t(`earnRules.${rule.id}.unitLabel`)
                      : t(`earnRules.${rule.id}.description`, params)}
                  </p>
                </div>
                <PointPill amount={rule.amount} />
              </li>
            ))}
            {COMMUNITY_CREDIT_BONUS_RULES.map((bonus) => (
              <li key={bonus.id} className='flex items-center gap-3 rounded-[1.125rem] bg-[var(--brand-soft)] px-4 py-3'>
                <p className='min-w-0 flex-1 text-[14.5px] font-bold text-[var(--foreground)]'>
                  {t(`bonusRules.${bonus.id}.label`)}{' '}
                  <span className='text-[12px] font-semibold text-[var(--muted-foreground)]'>{t('earn.once')}</span>
                </p>
                <PointPill amount={bonus.amount} />
              </li>
            ))}
          </ul>

          <details className='group mt-3 rounded-[1.25rem] bg-white shadow-[0_0_0_1px_var(--border)]'>
            <summary className='flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[14px] font-bold text-[var(--foreground)] [&::-webkit-details-marker]:hidden'>
              {t('earn.detailsToggle')}
              <span aria-hidden className='text-[var(--muted)] transition group-open:rotate-180'>⌄</span>
            </summary>
            <div className='space-y-3 px-4 pb-4'>
              {COMMUNITY_CREDIT_EARN_RULES.map((rule) => (
                <div key={rule.id}>
                  <p className='text-[13.5px] font-bold text-[var(--foreground)]'>
                    {t(`earnRules.${rule.id}.label`)} <span className='text-[var(--brand)]'>+{format.number(rule.amount)}</span>
                    {rule.maxAmount ? (
                      <span className='font-medium text-[var(--muted)]'> {t('earn.maxParen', { amount: format.number(rule.maxAmount) })}</span>
                    ) : null}
                  </p>
                  <p className='mt-0.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>
                    {t(`earnRules.${rule.id}.description`, params)}
                  </p>
                </div>
              ))}
              <ul className='space-y-1.5 rounded-[1.125rem] bg-[var(--surface)] p-3.5'>
                {COMMUNITY_CREDIT_EARN_EFFICIENCY.map((row) => (
                  <li key={row.id} className='flex items-baseline justify-between gap-3 text-[13px]'>
                    <span className='text-[var(--foreground)]'>{t(`efficiency.${row.id}.activity`)}</span>
                    <span className='shrink-0 font-semibold tabular-nums text-[var(--brand)]'>
                      {t('earn.perUnit', { amount: format.number(row.amount), unit: t(`efficiency.${row.id}.unit`) })}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className='space-y-1 text-[13px] text-[var(--muted-foreground)]'>
                {COMMUNITY_CREDIT_NO_EARN.map((id) => (
                  <li key={id} className='flex gap-2'>
                    <BanIcon className='mt-0.5 size-4 shrink-0 text-[var(--muted)]' />
                    {t(`noEarn.${id}`)}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </Card>

        <Card id='principles' icon={icon('principles')} title={t('principlesSection.title')} description={t('principlesSection.description')}>
          <ul className='grid gap-2.5 sm:grid-cols-2'>
            {COMMUNITY_CREDIT_PRINCIPLES.map((item) => (
              <li key={item.id} className='rounded-[1.125rem] bg-[var(--surface)] px-4 py-3.5'>
                <p className='text-[14px] font-bold text-[var(--foreground)]'>{t(`principles.${item.id}.title`)}</p>
                <p className='mt-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{t(`principles.${item.id}.body`)}</p>
              </li>
            ))}
          </ul>
          <p className='mb-3 mt-5 text-[14px] font-bold text-[var(--foreground)]'>{t('principlesSection.flowTitle')}</p>
          <Steps group='workflow' steps={COMMUNITY_CREDIT_WORKFLOW} />
        </Card>

        <Card id='limits' icon={icon('limits')} title={t('limits.title')} description={t('limits.description')}>
          <div className='grid gap-2.5 sm:grid-cols-2'>
            <div className='rounded-[1.125rem] bg-[var(--surface)] px-4 py-3.5'>
              <p className='text-[14px] font-bold text-[var(--foreground)]'>{t('limits.earnTitle')}</p>
              <ul className='mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                <li>
                  {withNode(
                    t('limits.commentCap'),
                    'amount',
                    <strong className='text-[var(--foreground)]'>{format.number(COMMUNITY_CREDIT_LIMITS.commentDailyCap)}</strong>,
                  )}
                </li>
                <li>{t('limits.noSelfReply')}</li>
                <li>{t('limits.revokeOnDelete')}</li>
                <li>{t('limits.oncePerAccount')}</li>
              </ul>
            </div>
            <div className='rounded-[1.125rem] bg-[var(--surface)] px-4 py-3.5'>
              <p className='text-[14px] font-bold text-[var(--foreground)]'>{t('limits.spendTitle')}</p>
              <ul className='mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                {openOptions.map((option) => (
                  <li key={option.id}>
                    {withNode(
                      t('limits.optionCap', {
                        label: t(`redeemOptions.${option.id}.label`),
                        duration: t(`redeemOptions.${option.id}.duration`),
                      }),
                      'cap',
                      <strong className='text-[var(--foreground)]'>{t('limits.times', { count: option.monthlyCap })}</strong>,
                    )}
                  </li>
                ))}
                <li>{t('limits.recentActivity', { days: format.number(COMMUNITY_CREDIT_LIMITS.recentActivityDays) })}</li>
              </ul>
            </div>
          </div>
          <ul className='mt-3 space-y-2'>
            {COMMUNITY_CREDIT_REVOCATION.map((id) => (
              <li key={id} className='flex gap-2.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>
                <AlertIcon className='mt-0.5 size-4 shrink-0 text-[var(--muted)]' />
                {t(`revocation.${id}`)}
              </li>
            ))}
          </ul>
        </Card>

        <Card id='faq' icon={icon('faq')} title={t('faqSection.title')}>
          <div className='space-y-2'>
            {COMMUNITY_CREDIT_FAQ.map((id) => (
              <Question key={id} q={t(`faq.${id}.q`, params)} a={t(`faq.${id}.a`, params)} />
            ))}
          </div>
          <p className='mb-2 mt-5 text-[14px] font-bold text-[var(--foreground)]'>{t('faqSection.glossaryTitle')}</p>
          <div className='space-y-2'>
            {COMMUNITY_CREDIT_GLOSSARY.map((id) => (
              <Question key={id} q={t(`glossary.${id}.term`)} a={t(`glossary.${id}.definition`, params)} />
            ))}
          </div>
        </Card>

        <footer className='mt-4 rounded-[1.5rem] bg-[var(--surface)] px-5 py-5'>
          <p className='text-[12.5px] leading-relaxed text-[var(--muted-foreground)]'>{t('footer.disclaimer')}</p>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Link
              href={href('/me')}
              className='inline-flex h-11 items-center rounded-full bg-[var(--brand)] px-5 text-[14px] font-bold text-white transition hover:bg-[var(--brand-hover)]'
            >
              {t('footer.myPage')}
            </Link>
            <Link
              href={href('/food/new')}
              className='inline-flex h-11 items-center rounded-full bg-white px-5 text-[14px] font-bold text-[var(--foreground)] transition hover:bg-[var(--border)]'
            >
              {t('footer.writeFood')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Card({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className='mt-4 scroll-mt-32 rounded-[1.5rem] bg-white p-5 shadow-[0_0_0_1px_var(--border),var(--ellieo-card-shadow)]'
    >
      <div className='flex items-start gap-3'>
        <EllieoIconBadge icon={icon} size={40} />
        <div className='min-w-0 pt-0.5'>
          <h2 className='text-[19px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--foreground)]'>{title}</h2>
          {description ? <p className='mt-1 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]'>{description}</p> : null}
        </div>
      </div>
      <div className='mt-4'>{children}</div>
    </section>
  )
}

function PointPill({ amount }: { amount: number }) {
  const format = useFormat()
  return (
    <span className='shrink-0 rounded-full bg-[var(--brand)] px-3 py-1 text-[15px] font-extrabold tabular-nums text-white'>
      +{format.number(amount)}
    </span>
  )
}

function RedeemOption({ option }: { option: CommunityCreditRedeemOption }) {
  const t = useT('credit')
  const format = useFormat()
  const base = `redeemOptions.${option.id}`
  const params = { cost: format.number(option.cost) }
  return (
    <article className={cn('rounded-[1.25rem] bg-[var(--surface)] p-4', option.comingSoon && 'opacity-80')}>
      <div className='flex items-start gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <h3 className='text-[16.5px] font-extrabold tracking-[-0.01em] text-[var(--foreground)]'>{t(`${base}.label`)}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                option.comingSoon ? 'bg-white text-[var(--muted)]' : 'bg-[var(--brand-soft)] text-[var(--brand-deep)]',
              )}
            >
              {option.comingSoon ? t('redeem.comingSoon') : t('redeem.applySoon')}
            </span>
          </div>
          <p className='mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]'>{t(`${base}.description`)}</p>
        </div>
        <div className='shrink-0 rounded-[1rem] bg-white px-3 py-2 text-center'>
          <p className='text-[22px] font-extrabold leading-none tabular-nums text-[var(--brand)]'>{format.number(option.cost)}</p>
          <p className='mt-0.5 text-[11px] font-semibold text-[var(--muted)]'>{t('redeem.credits')}</p>
        </div>
      </div>
      <div className='mt-3 flex flex-wrap gap-1.5'>
        {[
          t(`${base}.duration`),
          t('redeem.monthlyCap', { count: option.monthlyCap }),
          ...(option.comingSoon ? [] : [t('redeem.foodEquivalent', { count: foodPostsEquivalent(option.cost) })]),
        ].map((label) => (
          <span key={label} className='rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--muted-foreground)]'>
            {label}
          </span>
        ))}
      </div>
      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <CheckList title={t('redeem.includes')} items={option.includes.map((id) => t(`${base}.includes.${id}`, params))} positive />
        <CheckList title={t('redeem.excludes')} items={option.excludes.map((id) => t(`${base}.excludes.${id}`, params))} />
      </div>
      {option.hasNote ? <p className='mt-3 text-[12px] leading-relaxed text-[var(--muted)]'>{t(`${base}.note`)}</p> : null}
    </article>
  )
}

function CheckList({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div>
      <p className='text-[12px] font-bold text-[var(--muted)]'>{title}</p>
      <ul className='mt-1.5 space-y-1'>
        {items.map((line) => (
          <li key={line} className='flex gap-2 text-[13px] leading-snug text-[var(--muted-foreground)]'>
            <span aria-hidden className={positive ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}>
              {positive ? '✓' : '✕'}
            </span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Steps({ group, steps }: { group: 'workflow' | 'redeemProcess'; steps: readonly { step: number; id: string }[] }) {
  const t = useT('credit')
  const format = useFormat()
  return (
    <ol className='relative space-y-3 before:absolute before:bottom-3 before:left-[0.9rem] before:top-3 before:w-0.5 before:bg-[var(--brand-subtle)]'>
      {steps.map((item) => (
        <li key={item.step} className='relative flex gap-3'>
          <span className='z-[1] flex size-[1.875rem] shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[12.5px] font-extrabold text-white ring-4 ring-white'>
            {format.number(item.step)}
          </span>
          <div className='min-w-0 pt-1'>
            <p className='text-[14.5px] font-bold text-[var(--foreground)]'>{t(`${group}.${item.id}.title`)}</p>
            <p className='mt-0.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]'>{t(`${group}.${item.id}.description`)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Question({ q, a }: { q: string; a: string }) {
  return (
    <details className='group rounded-[1.125rem] bg-[var(--surface)]'>
      <summary className='flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 text-[14px] font-bold text-[var(--foreground)] [&::-webkit-details-marker]:hidden'>
        {q}
        <span aria-hidden className='mt-0.5 shrink-0 text-[var(--muted)] transition group-open:rotate-45'>
          ＋
        </span>
      </summary>
      <p className='px-4 pb-4 text-[13.5px] leading-relaxed text-[var(--muted-foreground)]'>{a}</p>
    </details>
  )
}
