/*
 * 공고 급여 정리: 요약의 급여 문장("연봉 $86,000–$114,000 (base salary만 해당)")에서 단위와 범위를 뽑고,
 * 해마다 다시 열리는 같은 포지션("2026 Early Career Mechanical Engineer" → "2027 …")을 연도를 빼고 묶는다.
 * 공고의 "연도별 급여" 비교에 쓴다. 요약은 한국어 원문 기준 (번역문 아님).
 */

/** year 연봉 · month 월급 · biweek 2주급 · week 주급 · hour 시급 · total 프로그램 전체 (예: "10주 프로그램 총 $15,384") */
export type PayUnit = 'year' | 'month' | 'biweek' | 'week' | 'hour' | 'total'
export type PostingPay = { unit: PayUnit; min: number; max: number }

const AMOUNT = String.raw`\$\s?([\d,]+(?:\.\d+)?)\s*([kK])?`
const RANGE = new RegExp(`${AMOUNT}(?:\\s*(?:[–~-]|to|부터)\\s*(?:${AMOUNT}|([\\d,]+(?:\\.\\d+)?)\\s*([kK])?))?`)

function amount(value: string | undefined, k: string | undefined): number | null {
  if (!value) return null
  const n = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return k ? n * 1000 : n
}

/** 급여 문장 → { unit, min, max }. 금액이 없으면 null. */
export function parsePay(text: string | null | undefined): PostingPay | null {
  const source = String(text || '')
  const m = RANGE.exec(source)
  if (!m) return null
  const low = amount(m[1], m[2])
  if (!low) return null
  // "$90–110k": 앞 숫자에 k가 없어도 뒤 숫자의 k를 따른다
  const highK = m[4] || m[6]
  const high = amount(m[3] ?? m[5], highK) ?? low
  const min = !m[2] && highK && low < 1000 ? low * 1000 : low
  const max = Math.max(min, high)

  const lower = source.toLowerCase()
  let unit: PayUnit
  if (/시급|hourly|per hour|\/\s?hr|\/\s?hour/.test(lower)) unit = 'hour'
  else if (/2주급|격주|bi-?weekly|every (two|2) weeks|per (two|2) weeks/.test(lower)) unit = 'biweek'
  else if (/주급|weekly|per week|\/\s?wk|\/\s?week/.test(lower)) unit = 'week'
  else if (/월급|월\s*\$|monthly|per month|\/\s?mo/.test(lower) && !/연봉|연\s*\$|annual/.test(lower)) unit = 'month'
  else if (/(\d+\s*주|weeks?)\s*(프로그램|program)|프로그램\s*(전체|총)/.test(lower) && !/연봉|annual|per year/.test(lower)) unit = 'total'
  else if (max < 500) unit = 'hour'
  else unit = 'year'
  return { unit, min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 }
}

const YEAR = /\b20\d\d(?:\s*[-–/]\s*(?:20)?\d\d)?\b/g

/** 연도·구두점·대소문자를 뺀 포지션 이름: "Associate, Client Service, 2027" == "Associate, Client Service 2026" */
export function positionKey(title: string): string {
  return String(title || '')
    .replace(YEAR, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** 공고의 시즌(연도): 제목의 연도 (2026–2027 이면 앞 연도), 없으면 등록 연도. */
export function postingSeason(title: string, createdAt: number): number {
  const m = /\b(20\d\d)\b/.exec(String(title || ''))
  if (m) return Number(m[1])
  return new Date(createdAt).getUTCFullYear()
}

/** 같은 포지션의 지난 공고 한 건 (새 공고 화면의 "작년 공고 급여"). */
export type PreviousPay = PostingPay & { season: number; title: string; open: boolean }

export type PayHistoryRow = {
  id: string
  companyId: string
  title: string
  level: string
  pay: PostingPay | null
  createdAt: number
  open: boolean
}

/**
 * 같은 회사·같은 포지션의 지난 시즌 공고 급여 (최근 시즌부터, 최대 3개).
 * 같은 시즌에 지역만 다르게 여러 개 열린 공고는 하나로 본다.
 */
export function previousPayFor(
  posting: { id: string; companyId: string; title: string; level: string; createdAt: number },
  history: PayHistoryRow[],
): PreviousPay[] {
  const key = positionKey(posting.title)
  if (!key) return []
  const season = postingSeason(posting.title, posting.createdAt)
  const bySeason = new Map<number, PreviousPay>()
  for (const row of history) {
    if (row.id === posting.id || row.companyId !== posting.companyId || !row.pay) continue
    if (row.level !== posting.level || positionKey(row.title) !== key) continue
    const s = postingSeason(row.title, row.createdAt)
    if (s >= season) continue
    const seen = bySeason.get(s)
    // 같은 시즌이면 범위를 합친다 (지역별 공고)
    if (seen && seen.unit === row.pay.unit) {
      seen.min = Math.min(seen.min, row.pay.min)
      seen.max = Math.max(seen.max, row.pay.max)
      seen.open ||= row.open
    } else if (!seen) {
      bySeason.set(s, { ...row.pay, season: s, title: row.title, open: row.open })
    }
  }
  return [...bySeason.values()].sort((a, b) => b.season - a.season).slice(0, 3)
}
