/**
 * Basic objectionable-content filter for community posts and comments (App Store guideline 1.2).
 * Korean + English slurs, sexual harassment, hate speech and strong profanity. Deliberately small and strict:
 * only words that are almost never innocent, so ordinary posts are not rejected. Reports + auto-hide
 * (src/lib/community/reports.server.ts) catch the rest.
 *
 * Normalization: lower case, NFKC (full-width letters → ASCII), link tokens skipped, leetspeak for English (0→o, 1→i,
 * 3→e, 4→a, 5→s, 7→t, @→a, $→s, !→i) with symbols inside an English word dropped ("f*ck"), symbols/digits inside a
 * Korean word dropped ("씨1발"), single letters / lone jamo joined across spaces ("f u c k", "ㅅ ㅂ") but Korean
 * syllables never glued ("9시 발", "질병 신고"). "시발" / "병신" inside common compounds ("즉시발급", "질병신고") are
 * skipped; "shit", "slut", "nigger", "chink", phrases are matched by word shape ("Yoshitaka", "snigger", "go diet" pass).
 * No test runner in this repo: the cases were checked with a scratch `tsx` script.
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
const KO_ALLOW = ['시발점', '시발역', '시발택시', '시발자동차', '윤간호', '언니엄마']

/**
 * Terms that are also the inside of ordinary compounds: an occurrence is skipped when the syllable before / after it is
 * listed ("즉시발급", "동시발생", "출시발표", "질병신고", "투병신청"). A standalone "시발" / "병신" is still blocked.
 */
const KO_CONTEXT: Record<string, { before?: string; after?: string }> = {
  시발: { before: '즉임동출공실수개검발착첫막시', after: '점생급송표령효견족전행매주' },
  병신: { before: '질발투열전' },
}

/** English terms matched inside a word (fucking, motherfucker). */
const EN_SUBSTRING = [
  'fuck', 'fck', 'phuck', 'bitch', 'cunt', 'faggot', 'motherf', 'asshole', 'dickhead',
  'whore', 'retarded', 'kike', 'wetback', 'chinaman', 'tranny', 'pussy', 'blowjob', 'handjob', 'cocksuck',
  'jackass', 'dumbass', 'bastard',
]

/** English terms with a word shape (they appear inside innocent words: "Yoshitaka", "Slutsky", "snigger"). */
const EN_PATTERNS: [string, RegExp][] = [
  ['shit', /^shit|shit(s|ty|ting|ted|head|heads|hole|holes)?$/],
  ['slut', /^slut(s|ty)?$/],
  ['nigger', /^nigger(s|z)?$/],
  ['nigga', /^nigga(s|z)?$/],
]

/** English terms that must be a whole word (they appear inside innocent words: "Scunthorpe", "spice", "fagus"). */
const EN_WORDS = [
  'fag', 'fags', 'retard', 'retards', 'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks', 'coon', 'coons', 'jap', 'japs',
  'twat', 'wanker', 'kys', 'dyke', 'dykes', 'stfu', 'gtfo', 'milf',
]

/** Phrases, matched as whole words (after normalization, words joined with a single space). */
const EN_PHRASES = ['kill yourself', 'kill urself', 'go die', 'send nudes', 'suck my', 'rape you', 'ill rape', 'i will rape']

/** Innocent English words containing a substring term. Checked per word. */
const EN_ALLOW = new Set(['shitake', 'shiitake', 'scunthorpe', 'pussycat', 'pussycats', 'pussywillow', 'shitzu', 'shihtzu'])

/** Innocent English idioms containing a whole-word term, removed before matching. */
const EN_ALLOW_PHRASES = /\bchinks? in (?:the|their|his|her|its|my|our|your) armou?r\b/g

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }

// Compatibility jamo (ㅅㅂ) become conjoining jamo under NFKC, so the lists are normalized the same way as the text.
const KO_TERMS_N = KO_TERMS.map((term) => term.normalize('NFKC'))
const KO_ALLOW_N = KO_ALLOW.map((term) => term.normalize('NFKC'))

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/
const JAMO_ONLY = /^[ᄀ-ᇿ㄰-㆏]$/

/** "https://…", "www.…" and bare "domain.tld/path" tokens are links, not prose. */
function isUrl(token: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)/i.test(token) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*$/i.test(token)
}

/** Whitespace-separated tokens without links. */
function tokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => token && !isUrl(token))
}

/** Joins runs of pieces that pass `single` ("f u c k" → "fuck", "ㅅ ㅂ" → "ㅅㅂ"). */
function joinSingles(pieces: string[], single: (piece: string) => boolean): string[] {
  const out: string[] = []
  let run = ''
  for (const piece of pieces) {
    if (single(piece)) {
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

/**
 * Korean words: inside a token, symbols / digits / Latin used as obfuscation are dropped ("씨1발", "씨.발" → "씨발"),
 * but spaces separate words — single syllables are never glued together ("9시 발", "질병 신고"). Only lone jamo are
 * joined across spaces ("ㅅ ㅂ"). A clock time ("9시발") is cut off first.
 */
function koreanWords(toks: string[]): string[] {
  const pieces: string[] = []
  for (const token of toks) {
    for (const part of token.split(/\d+시/)) {
      const hangul = part.replace(/[^ᄀ-ᇿ㄰-㆏가-힯]+/g, '')
      if (hangul) pieces.push(hangul)
    }
  }
  return joinSingles(pieces, (piece) => JAMO_ONLY.test(piece))
}

function koreanHit(word: string): string | null {
  let w = word
  for (const allowed of KO_ALLOW_N) w = w.split(allowed).join(' ')
  for (const term of KO_TERMS_N) {
    const context = KO_CONTEXT[term]
    let at = w.indexOf(term)
    while (at !== -1) {
      if (!context) return term
      const before = w[at - 1] ?? ''
      const after = w[at + term.length] ?? ''
      const compound =
        (before && context.before?.includes(before)) || (after && context.after?.includes(after))
      if (!compound) return term
      at = w.indexOf(term, at + 1)
    }
  }
  return null
}

function englishWords(toks: string[]): string[] {
  // symbols inside a word are dropped ("f*ck", "fu.ck" → "fck", "fuck"); spaces separate words
  const pieces = toks
    .map((token) => [...token].map((ch) => LEET[ch] ?? ch).join('').replace(/[^a-z]+/g, ''))
    .filter(Boolean)
  return joinSingles(pieces, (piece) => piece.length === 1)
}

function englishHit(word: string): string | null {
  if (EN_ALLOW.has(word)) return null
  const sub = EN_SUBSTRING.find((term) => word.includes(term))
  if (sub) return sub
  const shaped = EN_PATTERNS.find(([, pattern]) => pattern.test(word))
  if (shaped) return shaped[0]
  return EN_WORDS.includes(word) ? word : null
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
  const toks = tokens(value)

  if (HANGUL.test(value)) {
    for (const word of koreanWords(toks)) {
      const hit = koreanHit(word)
      if (hit) return hit
    }
  }

  const en = englishWords(tokens(value.replace(EN_ALLOW_PHRASES, ' ')))
  for (const word of en) {
    const hit = englishHit(word)
    if (hit) return hit
  }
  const joined = ` ${en.join(' ')} `
  return EN_PHRASES.find((p) => joined.includes(` ${p} `)) ?? null
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
