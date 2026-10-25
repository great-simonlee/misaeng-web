import type { Locale } from './locales'

/**
 * 화면 문구 번역기. 서버·클라이언트 공용 (I/O 없음).
 *
 * - 키는 `namespace.key.sub` 형태 (`t('community.comments.empty')`)
 * - `{name}` 자리에 params 값이 들어간다
 * - 한국어 조사: `{brand|을/를}`처럼 쓰면 값의 받침에 맞는 쪽을 붙인다 (Misaeng을 / Ellieo를)
 * - params에 count가 있으면 `key_one` / `key_other`처럼 복수형 키를 먼저 찾는다 (Intl.PluralRules)
 * - 없는 키는 키 문자열을 그대로 보여 준다 (개발 중 빠진 번역을 바로 알 수 있게)
 */

export type MessageTree = { [key: string]: string | MessageTree }

export type TranslateParams = Record<string, string | number | null | undefined>

export type Translate = (key: string, params?: TranslateParams) => string

function lookup(messages: MessageTree, key: string): string | undefined {
  let node: string | MessageTree | undefined = messages
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** 한글이 아닌 이름의 받침 여부 (읽는 소리 기준). 브랜드명처럼 자주 쓰는 값만 둔다. */
const LATIN_HAS_FINAL_CONSONANT: Record<string, boolean> = {
  Misaeng: true, // 미생
  Ellieo: false, // 엘리오
  NYC: false, // 엔와이씨
}

function hasFinalConsonant(value: string): boolean {
  const last = value.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  const known = LATIN_HAS_FINAL_CONSONANT[value.trim().split(/\s+/).pop() ?? '']
  if (known !== undefined) return known
  return /[bcdfgjklmnpqrstvxz]$/i.test(value.trim())
}

/** `으로/로`는 ㄹ 받침이면 `로` */
function pickParticle(value: string, withFinal: string, withoutFinal: string): string {
  if (withFinal === '으로') {
    const last = value.trim().slice(-1).charCodeAt(0)
    const rieul = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 === 8
    if (rieul) return withoutFinal
  }
  return hasFinalConsonant(value) ? withFinal : withoutFinal
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(
    /\{(\w+)(?:\|([^/{}]+)\/([^/{}]+))?\}/g,
    (match, name: string, withFinal?: string, withoutFinal?: string) => {
      const value = params[name]
      if (value === null || value === undefined) return match
      const text = String(value)
      return withFinal && withoutFinal ? text + pickParticle(text, withFinal, withoutFinal) : text
    },
  )
}

export function createTranslator(messages: MessageTree, locale: Locale): Translate {
  let plural: Intl.PluralRules | null = null
  return (key, params) => {
    let template: string | undefined
    if (params && typeof params.count === 'number') {
      plural ??= new Intl.PluralRules(locale)
      template = lookup(messages, `${key}_${plural.select(params.count)}`)
      template ??= lookup(messages, `${key}_other`)
    }
    template ??= lookup(messages, key)
    return template === undefined ? key : interpolate(template, params)
  }
}

/** 뒤의 트리가 앞의 트리를 덮는다. 빠진 번역을 기본 언어 문구로 채울 때 쓴다. */
export function mergeMessages(...trees: MessageTree[]): MessageTree {
  const out: MessageTree = {}
  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      const prev = out[key]
      out[key] =
        typeof value === 'object' && value && typeof prev === 'object' && prev
          ? mergeMessages(prev, value)
          : value
    }
  }
  return out
}
