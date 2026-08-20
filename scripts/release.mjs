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

function runQuiet(command) {
  return execSync(command, { cwd: root, shell: true, encoding: 'utf8' }).trim()
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

const originalRef = runQuiet('git rev-parse --abbrev-ref HEAD')
const originalSha = runQuiet('git rev-parse HEAD')
const version = readVersion()
const branch = `release/v${version}`

function restoreOriginalBranch() {
  if (originalRef === 'HEAD') {
    run(`git checkout ${originalSha}`)
    return
  }
  run(`git checkout ${originalRef}`)
}

try {
  run(`git checkout -B ${branch}`)

  if (noPush) {
    console.log(`${branch} 브랜치를 만들었습니다. 푸시는 건너뜁니다.`)
  } else {
    run(`git push -u origin ${branch} --follow-tags`)
    console.log(`프로덕션 브랜치 ${branch}를 푸시했습니다.`)
  }
} finally {
  restoreOriginalBranch()
  console.log(
    `${originalRef === 'HEAD' ? originalSha : originalRef} 브랜치로 돌아왔습니다.`,
  )
}
