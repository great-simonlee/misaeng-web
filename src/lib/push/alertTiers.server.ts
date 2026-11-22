import { rest as premiumRest } from '@lib/premium/entitlements.server'
import { listPublicPostings } from '@lib/supabase/jobPostings.server'

/*
 * New job posting alerts by plan (owner 11-22, live from the day Premium payments open):
 *   Premium members  → every postings push (Mon–Fri 13:00), verified or not (they paid for it)
 *   free members     → school / workplace verified only, ONE push a week: Monday, with the last 7 days of postings
 * Switch: PREMIUM_ALERT_TIERS=on in the server env. Off (default) = everyone verified gets every push, as before.
 * The first push after switching sends free members a one-time notice (claimFirstTime key below).
 */

export function alertTiersOn() {
  return process.env.PREMIUM_ALERT_TIERS?.trim().toLowerCase() === 'on'
}

/** Monday in New York (the free weekly digest day). */
export function isNewYorkMonday(now = new Date()) {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(
      now
    ) === 'Mon'
  )
}

/** Every member with Premium right now (same rule as isActiveEntitlement), in one paged query. */
export async function listPremiumUids(): Promise<Set<string>> {
  const out = new Set<string>()
  const nowIso = new Date().toISOString()
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const res = await premiumRest(
      `premium_entitlements?select=user_uid&status=in.(trialing,active,past_due)` +
        `&or=(current_period_end.is.null,current_period_end.gt.${encodeURIComponent(nowIso)})` +
        `&order=user_uid&limit=1000&offset=${offset}`
    )
    // Fail loudly: sending a paid member nothing (or a free member everything) must not happen silently.
    if (!res.ok) throw new Error(`Reading Premium members failed (HTTP ${res.status}).`)
    const rows = (await res.json()) as { user_uid: string }[]
    for (const row of rows) out.add(row.user_uid)
    if (rows.length < 1000) break
  }
  return out
}

export type WeeklyText = {
  title: { ko: string; en: string }
  body: { ko: string; en: string }
  postingCount: number
}

/** "지난 한 주 12개 회사에서 새 채용 공고 34개가 올라왔어요 · Google, Meta, Stripe 외" from open postings of 7 days. */
export async function weeklyPostingsText(now = Date.now()): Promise<WeeklyText | null> {
  const since = now - 7 * 86_400_000
  const fresh = (await listPublicPostings()).filter((p) => p.postedAt >= since)
  if (!fresh.length) return null
  const byCompany = new Map<string, { name: string; count: number }>()
  for (const p of fresh) {
    const entry = byCompany.get(p.company.id) ?? { name: p.company.name, count: 0 }
    entry.count += 1
    byCompany.set(p.company.id, entry)
  }
  const companies = [...byCompany.values()].sort((a, b) => b.count - a.count).map((c) => c.name)
  const n = fresh.length
  const c = companies.length
  const top = companies.slice(0, 3).join(', ')
  const more = c > 3
  return {
    title: { ko: '미생 · 이번 주 채용 공고', en: 'Misaeng · This week’s job postings' },
    body:
      n === 1
        ? {
            ko: `지난 한 주 ${companies[0]} · ${fresh[0].title} 공고가 올라왔어요`,
            en: `New posting this past week: ${companies[0]} · ${fresh[0].title}`,
          }
        : c === 1
          ? {
              ko: `지난 한 주 ${companies[0]}에서 새 채용 공고 ${n}개가 올라왔어요`,
              en: `${n} new job postings from ${companies[0]} this past week`,
            }
          : {
              ko: `지난 한 주 ${c}개 회사에서 새 채용 공고 ${n}개가 올라왔어요 · ${top}${more ? ' 외' : ''}`,
              en: `${n} new job postings from ${c} companies this past week · ${top}${more ? ' and more' : ''}`,
            },
    postingCount: n,
  }
}

/** One-time notice to free members when the tiers switch on. */
export const SWITCH_NOTICE_KEY = 'alert-tiers:switch-notice:v1'
export const SWITCH_NOTICE = {
  title: { ko: '새 채용 공고 알림이 바뀌었어요', en: 'Job posting alerts have changed' },
  body: {
    ko: '이제 무료 회원은 매주 월요일에 한 주 공고를 모아서 받아요. 매일 받으려면 미생 Premium을 시작해 보세요.',
    en: 'Free members now get one weekly digest on Mondays. Start Misaeng Premium to get new postings every weekday.',
  },
}
