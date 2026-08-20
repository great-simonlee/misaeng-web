import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const noPush = args.includes('--no-push')
const toolArgs = args.filter((arg) => arg !== '--no-push')

function run(command) {
  execSync(command, { stdio: 'inherit', cwd: root, shell: true })
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const version = String(pkg.version ?? '').trim()
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`package.json version이 semver가 아닙니다: ${version}`)
  }
  return version
}

run(`npx commit-and-tag-version ${toolArgs.join(' ')}`.trim())

if (dryRun) {
  console.log('dry-run이라 브랜치 생성과 푸시는 건너뜁니다.')
  process.exit(0)
}

const version = readVersion()
const branch = `release/v${version}`

run(`git checkout -B ${branch}`)

if (noPush) {
  console.log(`${branch} 브랜치를 만들었습니다. 푸시는 건너뜁니다.`)
  process.exit(0)
}

run(`git push -u origin ${branch} --follow-tags`)
console.log(`프로덕션 브랜치 ${branch}를 푸시했습니다.`)
