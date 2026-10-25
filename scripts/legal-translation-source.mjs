#!/usr/bin/env node
/**
 * 약관·개인정보처리방침에서 참고 번역이 필요한 영어 문구 목록을 뽑는다.
 *
 *   node --experimental-strip-types scripts/legal-translation-source.mjs <out-dir> [locale]
 *
 * <out-dir>/terms.json, privacy.json: [{ key, en, ko }] (key = legalTextKey(en)).
 * locale을 주면 src/lib/legal/translations/<doc>.<locale>.json에 이미 있는 문구는 빼고 뽑는다.
 * 번역 결과는 { "texts": { "<key>": "<번역>" } } 형태로 같은 폴더에 저장한다 (영어가 기준).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [outDir, locale] = process.argv.slice(2)
if (!outDir) {
  console.error('usage: legal-translation-source.mjs <out-dir> [locale]')
  process.exit(1)
}

function key(en) {
  let hash = 0x811c9dc5
  for (let i = 0; i < en.length; i += 1) {
    hash ^= en.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** 문서 TS 파일에서 { en, ko } 쌍과 제목(title/titleKo)을 순서대로 읽는다 */
function extract(file) {
  const src = readFileSync(join(root, file), 'utf8')
  const out = []
  const pair = /(?:^|\n)\s*(?:title|en): '((?:[^'\\]|\\.)*)',\s*\n\s*(?:titleKo|ko): '((?:[^'\\]|\\.)*)'/g
  let m
  while ((m = pair.exec(src))) {
    const unescape = (v) => v.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
    const en = unescape(m[1])
    out.push({ key: key(en), en, ko: unescape(m[2]) })
  }
  return out
}

mkdirSync(outDir, { recursive: true })
for (const [doc, file] of [
  ['terms', 'src/lib/constants/nycTermsOfUse.ts'],
  ['privacy', 'src/lib/constants/nycPrivacyPolicy.ts'],
]) {
  let items = extract(file)
  const seen = new Set()
  items = items.filter((item) => !seen.has(item.key) && seen.add(item.key))
  if (locale) {
    const existing = join(root, `src/lib/legal/translations/${doc}.${locale}.json`)
    if (existsSync(existing)) {
      const done = JSON.parse(readFileSync(existing, 'utf8')).texts || {}
      items = items.filter((item) => !done[item.key])
    }
  }
  writeFileSync(join(outDir, `${doc}.json`), JSON.stringify(items, null, 2))
  console.log(`${doc}: ${items.length} texts`)
}
