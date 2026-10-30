import { BRAND } from '@lib/brand'

import type { Locale } from './locales'
import { mergeMessages, type MessageTree } from './translate'

/**
 * 화면 문구 파일: `src/messages/{locale}/{namespace}.json`
 * 새 화면 묶음을 추가하면 NAMESPACES에도 추가한다. 한국어(ko)가 원문이고 en이 기준 번역이다.
 */
export const NAMESPACES = [
  'common',
  'nav',
  'hub',
  'auth',
  'me',
  'community',
  'food',
  'housing',
  'reviews',
  'companies',
  'credit',
  'points',
  'partners',
  'legal',
  'consent',
  'api',
] as const

export type Namespace = (typeof NAMESPACES)[number]

async function loadNamespace(locale: Locale, namespace: Namespace): Promise<MessageTree> {
  try {
    const mod = (await import(`../../messages/${locale}/${namespace}.json`)) as {
      default: MessageTree
    }
    return mod.default ?? {}
  } catch {
    return {}
  }
}

async function loadLocale(locale: Locale): Promise<MessageTree> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const),
  )
  return Object.fromEntries(entries)
}

/**
 * 브랜드별 문구 덮어쓰기: `src/messages/{locale}/_brand/{brand}.json` ({ namespace: { key: … } }).
 * 같은 기능인데 브랜드명이 문구에 박힌 곳(예: "Misaeng 팀이 올린 매물")만 둔다. 없으면 빈 객체.
 */
async function loadBrandOverlay(locale: Locale): Promise<MessageTree> {
  try {
    const mod = (await import(`../../messages/${locale}/_brand/${BRAND}.json`)) as {
      default: MessageTree
    }
    return mod.default ?? {}
  } catch {
    return {}
  }
}

const cache = new Map<Locale, Promise<MessageTree>>()

/**
 * 빠진 문구는 en → ko 순으로 채운다. 번역이 늦어도 화면에 키가 그대로 보이지 않게 한다.
 * (ko 화면은 ko → en 순)
 */
export function getMessages(locale: Locale): Promise<MessageTree> {
  const cached = cache.get(locale)
  if (cached) return cached
  const chain: Locale[] = locale === 'ko' ? ['en', 'ko'] : ['ko', 'en', locale]
  const unique = [...new Set(chain)]
  const promise = Promise.all([
    ...unique.map(loadLocale),
    ...unique.map(loadBrandOverlay),
  ]).then((trees) => {
    const base = trees.slice(0, unique.length)
    const overlays = trees.slice(unique.length)
    return mergeMessages(...base, ...overlays)
  })
  if (process.env.NODE_ENV === 'production') cache.set(locale, promise)
  return promise
}

/** 서버에서만 쓰는 문구(API 에러 등) */
const SERVER_ONLY_NAMESPACES: readonly string[] = ['api']

/** 브라우저로 보낼 문구 (서버 전용 네임스페이스 제외) */
export async function getClientMessages(locale: Locale): Promise<MessageTree> {
  const messages = await getMessages(locale)
  return Object.fromEntries(
    Object.entries(messages).filter(([ns]) => !SERVER_ONLY_NAMESPACES.includes(ns)),
  )
}
