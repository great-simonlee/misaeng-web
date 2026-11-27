/*
 * Intern season ("intern term") for job postings: "YYYY-season", the season the internship STARTS.
 * Shared contract with ellieo-erp (job_postings.intern_term) and the apps (PublicPosting.internTerm).
 * Pure module (no imports) so node:test can run it directly: internTerm.test.mjs
 */

export const INTERN_SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type InternSeason = (typeof INTERN_SEASONS)[number]

/** "2026-summer" */
export const INTERN_TERM_PATTERN = /^20\d{2}-(spring|summer|fall|winter)$/

const SEASON_WORDS: Record<string, InternSeason> = {
  spring: 'spring',
  summer: 'summer',
  fall: 'fall',
  autumn: 'fall',
  winter: 'winter',
  봄: 'spring',
  여름: 'summer',
  가을: 'fall',
  겨울: 'winter',
}

const SEASON = '(spring|summer|fall|autumn|winter|봄|여름|가을|겨울)'
// 2026 / '26 / ’26 / 26년 (Korean short year)
const YEAR_AFTER = "(?:(20\\d{2})(?!\\d)|['’](\\d{2})(?!\\d))"
const YEAR_BEFORE = '(?:(?<!\\d)(20\\d{2})년?|(?<!\\d)(\\d{2})년)'
const NOT_LETTER_BEFORE = '(?<![a-z])'
const NOT_LETTER_AFTER = '(?![a-z])'
// up to 3 filler words between season and year ("Summer Analyst Program 2026"), never "class of 2027"
const FILLER = "(?:\\s+(?!of\\b|class\\b)[a-z&'’.\\-]+){1,3}"

type Rule = { re: RegExp; seasonFirst: boolean }

// Tightest first: "Summer 2026", "2026 Summer", "2026년 여름"; then loose "Summer Analyst 2026", "2026 Global Summer".
const RULES: Rule[] = [
  { re: new RegExp(`${NOT_LETTER_BEFORE}${SEASON}${NOT_LETTER_AFTER}[\\s,/–—-]*(?:of\\s+)?${YEAR_AFTER}`, 'gi'), seasonFirst: true },
  { re: new RegExp(`${YEAR_BEFORE}[\\s,/–—-]*${SEASON}${NOT_LETTER_AFTER}`, 'gi'), seasonFirst: false },
  { re: new RegExp(`${NOT_LETTER_BEFORE}${SEASON}${NOT_LETTER_AFTER}${FILLER}\\s+${YEAR_AFTER}`, 'gi'), seasonFirst: true },
  { re: new RegExp(`(?<!\\d)(20\\d{2})(?!\\d)${FILLER}\\s+${SEASON}${NOT_LETTER_AFTER}`, 'gi'), seasonFirst: false },
]

function termFrom(match: RegExpMatchArray, seasonFirst: boolean): string | null {
  const [seasonWord, full, short] = seasonFirst
    ? [match[1], match[2], match[3]]
    : match.length > 3
      ? [match[3], match[1], match[2]]
      : [match[2], match[1], undefined]
  const season = SEASON_WORDS[String(seasonWord || '').toLowerCase()]
  const year = full ?? (short ? `20${short}` : null)
  if (!season || !year) return null
  const term = `${year}-${season}`
  return INTERN_TERM_PATTERN.test(term) ? term : null
}

/** Season + year in free text ("Summer 2026 Intern", "2027 Winter Co-op", "2026년 여름 인턴"). Earliest match wins. */
export function parseInternTerm(text: string | null | undefined): string | null {
  const source = String(text || '')
  if (!source.trim()) return null
  for (const { re, seasonFirst } of RULES) {
    for (const match of source.matchAll(re)) {
      const term = termFrom(match, seasonFirst)
      if (term) return term
    }
  }
  return null
}

/** Stored value if valid ("2026-summer"), else null */
export function normalizeInternTerm(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const term = value.trim().toLowerCase()
  return INTERN_TERM_PATTERN.test(term) ? term : null
}

/**
 * Intern term for a posting: intern postings only. The DB column (ellieo-erp) wins when valid;
 * otherwise parsed from the title, then the summary work type.
 */
export function internTermFor(input: {
  level: string
  column?: unknown
  title?: string | null
  workType?: string | null
}): string | null {
  if (input.level !== 'intern') return null
  return normalizeInternTerm(input.column) ?? parseInternTerm(input.title) ?? parseInternTerm(input.workType)
}

/** "2026-summer" → { year: 2026, season: 'summer' } (null if invalid) */
export function splitInternTerm(term: string | null | undefined): { year: number; season: InternSeason } | null {
  const valid = normalizeInternTerm(term)
  if (!valid) return null
  const [year, season] = valid.split('-')
  return { year: Number(year), season: season as InternSeason }
}

/** Sort key: chronological (year, then spring → summer → fall → winter) */
export function internTermOrder(term: string): number {
  const parts = splitInternTerm(term)
  return parts ? parts.year * 10 + INTERN_SEASONS.indexOf(parts.season) : Number.MAX_SAFE_INTEGER
}
