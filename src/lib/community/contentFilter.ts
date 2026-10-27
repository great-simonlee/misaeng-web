/**
 * Basic objectionable-content filter for community posts and comments (App Store guideline 1.2).
 * Korean + English slurs, sexual harassment, hate speech and strong profanity. Deliberately small and strict:
 * only words that are almost never innocent, so ordinary posts are not rejected. Reports + auto-hide
 * (src/lib/community/reports.server.ts) catch the rest.
 *
 * Normalization: lower case, NFKC (full-width letters → ASCII), leetspeak for English (0→o, 1→i, 3→e, 4→a, 5→s,
 * 7→t, @→a, $→s) with symbols inside an English word dropped ("f*ck"), anything that is not Hangul separating Korean
 * words ("씨1발"), and runs of single-character pieces joined ("f u c k", "ㅅ ㅂ" are caught; "질병 신고" is not glued
 * into "병신"). No test runner in this repo: the cases were checked with a scratch `node` script.
 *
 * The route rejects with 400 `{ error: t('community.contentBlocked'), code: CONTENT_BLOCKED_CODE }`.
 */

export const CONTENT_BLOCKED_CODE = 'CONTENT_BLOCKED'

/** Korean terms, matched as substrings of each normalized word (Hangul + Jamo only). */
const KO_TERMS = [
  // profanity
  '씨발', '씨빨', '씨바', '씨팔', '시발', '시팔', '씨벌', '쓰발', '쒸발', 'ㅆㅂ', 'ㅅㅂ', 'ㅆㅃ',
  '씹새', '씹년', '씹놈', '씹할', '씹창', '씹덕', '씹같',
  '병신', '븅신', '빙신', '병쉰', 'ㅂㅅ', 'ㅄ',
  '좆', '좇같', 'ㅈㄲ',
  '개새끼', '개새기', '개색기', '개색끼', '개세끼', '개쉐끼', '개쌔끼', '새끼야', 'ㄱㅅㄲ',
  '니애미', '니에미', '느금마', '니엄마', '애미뒤', '애비뒤', '엠창', '앰창',
  '미친년', '썅년', '썅놈', '쌍년', '쌍놈', '걸레년', '화냥년',
  // sexual harassment
  '보지털', '자지털', '보짓물', '섹스하자', '섹스할래', '강간하', '윤간', '몸팔',
  // hate speech / slurs
  '짱깨', '짱개', '쪽바리', '쪽발이', '깜둥이', '흑형', '똥남아', '한남충', '김치녀', '된장녀', '맘충',
  '틀딱', '급식충', '장애새끼', '게이새끼', '레즈새끼', '똥꼬충', '홍어새끼', '전라디언',
]

/** Innocent Korean words that contain a blocked term ("시발점" = starting point). Removed before matching. */
const KO_ALLOW = ['시발점', '시발역', '시발택시', '시발자동차']

/** English terms matched inside a word (fucking, motherfucker, bullshit). */
const EN_SUBSTRING = [
  'fuck', 'fck', 'phuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'motherf', 'asshole', 'dickhead',
  'whore', 'retarded', 'kike', 'wetback', 'chinaman', 'tranny', 'pussy', 'blowjob', 'handjob', 'cocksuck',
  'jackass', 'dumbass', 'bastard', 'slut',
]

/** English terms that must be a whole word (they appear inside innocent words: "Scunthorpe", "spice", "fagus"). */
const EN_WORDS = [
  'fag', 'fags', 'retard', 'retards', 'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks', 'coon', 'coons', 'jap', 'japs',
  'twat', 'wanker', 'kys', 'dyke', 'dykes', 'stfu', 'gtfo', 'milf',
]

/** Phrases (after normalization, words joined with a single space). */
const EN_PHRASES = ['kill yourself', 'kill urself', 'go die', 'send nudes', 'suck my', 'rape you', 'ill rape', 'i will rape']

/** Innocent English words containing a substring term. Checked per word. */
const EN_ALLOW = new Set(['shitake', 'shiitake', 'scunthorpe', 'pussycat', 'pussycats', 'pussywillow', 'shitzu', 'shihtzu'])

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }

// Compatibility jamo (ㅅㅂ) become conjoining jamo under NFKC, so the lists are normalized the same way as the text.
const KO_TERMS_N = KO_TERMS.map((term) => term.normalize('NFKC'))
const KO_ALLOW_N = KO_ALLOW.map((term) => term.normalize('NFKC'))

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/

/** Splits into pieces, then joins runs of single-character pieces ("f u c k" → "fuck"). */
function words(text: string, keep: RegExp): string[] {
  const pieces = text.split(keep).filter(Boolean)
  const out: string[] = []
  let run = ''
  for (const piece of pieces) {
    if ([...piece].length === 1) {
      run += piece
      continue
    }
    if (run) {
      out.push(run)
      run = ''
    }
    out.push(piece)
  }
  if (run) out.push(run)
  return out
}

function koreanWords(text: string): string[] {
  // Hangul only: everything else (spaces, symbols, digits, Latin) separates
  return words(text, /[^ᄀ-ᇿ㄰-㆏가-힯]+/)
}

function englishWords(text: string): string[] {
  const leet = [...text].map((ch) => LEET[ch] ?? ch).join('')
  // symbols inside a word are dropped ("f*ck", "fu.ck" → "fck", "fuck"); spaces separate words
  return words(leet, /\s+/)
    .map((word) => word.replace(/[^a-z]+/g, ''))
    .filter(Boolean)
}

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/** Collects every string inside a value (title, plain body, tips, timeline notes, menu items…). */
function collectStrings(value: unknown, out: string[], depth = 0) {
  if (depth > 5 || value == null) return
  if (typeof value === 'string') {
    // URLs (photos) are not user prose
    if (!/^https?:\/\//i.test(value.trim())) out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1)
    return
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collectStrings(item, out, depth + 1)
  }
}

/** The first blocked term found in one text, or null. */
export function findBlockedTerm(text: string): string | null {
  const value = normalize(String(text || ''))
  if (!value.trim()) return null

  if (HANGUL.test(value)) {
    for (const word of koreanWords(value)) {
      let w = word
      for (const allowed of KO_ALLOW_N) w = w.split(allowed).join(' ')
      const hit = KO_TERMS_N.find((term) => w.includes(term))
      if (hit) return hit
    }
  }

  const en = englishWords(value)
  for (const word of en) {
    if (EN_ALLOW.has(word)) continue
    const hit = EN_SUBSTRING.find((term) => word.includes(term)) ?? (EN_WORDS.includes(word) ? word : undefined)
    if (hit) return hit
  }
  const joined = ` ${en.join(' ')} `
  const phrase = EN_PHRASES.find((p) => joined.includes(` ${p} `) || joined.includes(` ${p}`))
  return phrase ?? null
}

/** Checks every string in the given values. Returns the first blocked term, or null when the content is fine. */
export function findBlockedContent(...values: unknown[]): string | null {
  const texts: string[] = []
  for (const value of values) collectStrings(value, texts)
  for (const text of texts) {
    const hit = findBlockedTerm(text)
    if (hit) return hit
  }
  return null
}
