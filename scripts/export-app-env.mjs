import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = process.argv[2]
if (target !== 'preview' && target !== 'production') {
  throw new Error('인자로 preview 또는 production을 넘기세요.')
}
// 두 번째 인자: 배포할 브랜드 (misaeng | ellieo). NEXT_PUBLIC_BRAND는 빌드 때 코드에 박히므로 여기서 고정한다.
const brand = process.argv[3]
if (brand && brand !== 'misaeng' && brand !== 'ellieo') {
  throw new Error('브랜드는 misaeng 또는 ellieo만 가능합니다.')
}

const raw = process.env.APP_ENV_JSON?.trim()
if (!raw) {
  throw new Error('GitHub Variable APP_ENV_JSON이 없습니다.')
}

let data
try {
  data = JSON.parse(raw)
} catch {
  throw new Error('APP_ENV_JSON이 JSON 형식이 아닙니다.')
}

if (!data || typeof data !== 'object' || Array.isArray(data)) {
  throw new Error('APP_ENV_JSON은 객체여야 합니다.')
}

if (brand) data.NEXT_PUBLIC_BRAND = brand

const KEY = /^[A-Z][A-Z0-9_]*$/
const entries = Object.entries(data)
const dotenvLines = []

for (const [key, value] of entries) {
  if (!KEY.test(key)) {
    throw new Error(`허용되지 않는 환경 변수 이름: ${key}`)
  }
  dotenvLines.push(`${key}=${JSON.stringify(value == null ? '' : String(value))}`)
}

mkdirSync('.vercel', { recursive: true })
writeFileSync(resolve(`.vercel/.env.${target}.local`), `${dotenvLines.join('\n')}\n`)

const githubEnv = process.env.GITHUB_ENV
if (githubEnv) {
  const chunks = entries.map(([key, value]) => {
    const text = value == null ? '' : String(value)
    return `${key}<<EOF\n${text}\nEOF`
  })
  appendFileSync(githubEnv, `${chunks.join('\n')}\n`)
}

console.log(`APP_ENV_JSON에서 ${entries.length}개 변수를 주입했습니다.`)
console.log(entries.map(([key]) => key).join(', '))
