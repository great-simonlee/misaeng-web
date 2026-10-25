# misaeng_temp_web

Next.js 기반 웹 프로젝트입니다.

- **버전**: 0.0.1
- **프레임워크**: [Next.js](https://nextjs.org) 16 (App Router)
- **UI**: React 19, [Tailwind CSS](https://tailwindcss.com) 4
- **언어**: TypeScript

## 요구 사항

- Node.js 18.x 이상
- npm / yarn / pnpm / bun 중 하나

## 시작하기

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열어 확인할 수 있습니다.  
`src/app/page.tsx` 를 수정하면 페이지가 자동으로 반영됩니다.

### 빌드 및 실행

```bash
npm run build
npm start
```

### 린트

```bash
npm run lint
```

## 프로젝트 구조

```
misaeng_temp_web/
├── src/
│   ├── app/              # App Router (라우팅만) → screens만 import
│   │   ├── (corporate)/  # 회사 페이지 루트 layout (영어)
│   │   ├── (service)/[locale]/[city]/  # 도시 서비스 루트 layout (언어별)
│   │   ├── api/
│   │   └── globals.css
│   ├── messages/          # 화면 문구 {locale}/{namespace}.json
│   ├── screens/           # 화면 단위 (한 페이지/플로우) → widgets, components 사용
│   ├── widgets/           # 복합 UI 블록 (Header, Card 등) → components 사용
│   ├── components/        # 원자 UI (Button, Input 등)
│   ├── hooks/
│   ├── lib/               # utils, api, constants, validators
│   │   ├── utils/         # cn, format, validation 등
│   │   ├── api/           # API 클라이언트·엔드포인트
│   │   ├── constants/     # 앱 상수
│   │   └── validators/    # 스키마·검증 (선택)
│   └── types/
├── public/
├── .cursor/rules/
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

**의존성 방향**: `app` → `screens` → `widgets` → `components` (상위만 하위 참조)

- 경로 별칭: `@screens`, `@widgets`, `@components`, `@lib`, `@hooks`, `@types` (tsconfig 참고)

## 브랜드(misaeng · ellieo)와 다국어

한 코드베이스를 Vercel 프로젝트 두 개로 배포한다. 차이는 `src/lib/brand/index.ts` 한 곳에만 둔다.

| | misaeng (misaeng.com) | ellieo |
|---|---|---|
| `NEXT_PUBLIC_BRAND` | `misaeng` (기본) | `ellieo` |
| 회사 페이지 (`/about` 등) | 영어 | 없음 → misaeng.com으로 이동 |
| 도시 서비스 (`/nyc/...`) | 한국어 기본 + 영어 | 영어 기본 + ko, vi, ja, zh-CN, zh-TW, id |
| 검색 노출 언어 | ko | ko 제외 6개 |
| 기타 | | 파란 테마, `/mobile-app` |

- **URL**: 기본 언어는 접두사 없이 `/nyc/...`, 다른 언어는 `/vi/nyc/...`. `src/proxy.ts`가 rewrite·redirect하고,
  canonical·hreflang을 HTTP `Link` 헤더로 붙인다 (한 언어는 한 도메인에서만 검색되게).
- **화면 문구**: `src/messages/{locale}/{namespace}.json`. 클라이언트 `useT('ns')`, 서버 `getT(locale, 'ns')`,
  API `getRequestT(request, 'api')` (`src/lib/i18n`). 한국어 조사는 `{brand|을/를}`처럼 쓴다.
- **사용자 콘텐츠 번역**: 글·댓글·매물은 ellieo-erp Misaeng → Translations 탭에서 매일 claude.ai로 번역해
  같은 Storage JSON에 저장한다 (`translations`, `sourceLocale`). 웹은 API 응답 직전에
  `src/lib/translations/localize.server.ts`로 보는 언어로 바꾸고, 화면에 "원문 보기"(`TranslationNotice`)를 붙인다.
  segment·해시 규칙은 ellieo-erp `src/app/util/contentTranslations.mjs`와 같아야 한다.
- **약관·개인정보처리방침**: 영문이 기준. ko는 문서 안에, 다른 언어는 `src/lib/legal/translations/*.json`
  (영어 문단 해시 → 번역). 영어를 고친 뒤 `node scripts/legal-translation-source.mjs <dir> <locale>`로
  번역할 문단만 뽑아 다시 번역한다.
- **선호 언어**: 프로필 `preferredLocale` (두 브랜드 공통 계정). 언어 메뉴·마이페이지·가입 후 프로필 설정에서 바꾼다.

배포: `.github/workflows/vercel-preview.yml`이 브랜드별로 빌드한다. ellieo는 Secret `VERCEL_PROJECT_ID_ELLIEO`와
Variable `APP_ENV_JSON_ELLIEO`(형식은 `APP_ENV_JSON`과 같고 `NEXT_PUBLIC_SITE_URL`에 ellieo 주소)를 넣으면 배포된다.

## 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

## 배포 (GitHub Actions + Vercel)

Vercel Git 자동 배포는 끄고, GitHub Actions에서 빌드한 산출물을 배포합니다.

### GitHub Secrets / Variables

**Secrets** (`Settings → Secrets and variables → Actions → Secrets`)

| Secret | 설명 |
|---|---|
| `VERCEL_TOKEN` | [Vercel 토큰](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel 팀(또는 계정) ID |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 ID |
| `BASTION_SSH_KEY` | 배스천/EC2 SSH PEM 전체 |
| `BASTION_HOST` | 배스천 공인 IP |
| `APP_HOST` | 내부 EC2 사설 IP |
| `SSH_USER` | SSH 유저 (예: `ec2-user`) |

ID는 Vercel 대시보드 **Project Settings → General**의 Project ID, **Team Settings → General**의 Team ID에서 확인할 수 있습니다.

**Variables** (`Settings → Secrets and variables → Actions → Variables`)

| Variable | 설명 |
|---|---|
| `APP_ENV_JSON` | 앱 환경 변수 JSON (`app-env.example.json` 형식) |

앱 환경 변수는 `APP_ENV_JSON` 하나에 JSON으로 넣습니다. 형식은 `app-env.example.json`을 참고하세요.

```json
{
  "APP_CONNECT_API_BASE_URL": "",
  "APP_CONNECT_DEVICE_ID": "",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID": "",
  "NEXT_PUBLIC_SUPABASE_URL": "",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
  "SUPABASE_SERVICE_ROLE_KEY": ""
}
```

워크플로가 이 JSON을 읽어 `.vercel/.env.*.local`과 러너 환경 변수로 주입한 뒤 `vercel build`합니다.

### Preview / Production

| | Preview | Production |
|---|---|---|
| 워크플로 | `.github/workflows/vercel-preview.yml` | `.github/workflows/vercel-production.yml` |
| 트리거 | `feature/ci_cd` push | `release/vX.Y.Z` push (`release/v1.0.0` 형식) |
| 환경 | Vercel Preview 환경 변수 | Vercel Production 환경 변수 |
| URL | 임시 Preview URL | 프로덕션 alias (도메인) |

`--prod` 배포가 만든 **고유 URL**(`*.vercel.app` 해시 주소)은 Deployment Protection 때문에 Vercel 로그인이 필요합니다. 일반 사용자는 프로젝트에 연결된 **production alias**(예: `프로젝트명.vercel.app` 또는 커스텀 도메인)로 접속합니다.

`main`에 푸시해도 프로덕션은 배포되지 않습니다.

### 버전 관리와 릴리즈

`commit-and-tag-version`(`standard-version` 포크)으로 버전을 올리고, `release/vX.Y.Z` 브랜치에 푸시합니다. 워킹 트리가 깨끗한 상태에서 실행하세요.

```bash
npm run release:dry                       # 버전/체인지로그 미리보기 (푸시 안 함)
npm run release                           # 버전 bump → CHANGELOG → 태그 → release/vX.Y.Z 푸시
npm run release -- --no-push              # 로컬 브랜치/태그만 생성
npm run release -- --first-release        # 현재 버전을 첫 릴리즈로 태그
npm run release -- --release-as 1.0.0     # 버전을 직접 지정
```

`npm run release`가 하는 일:

1. `package.json` 버전 bump, `CHANGELOG.md` 갱신
2. `chore(release): vX.Y.Z` 커밋과 `vX.Y.Z` 태그 생성
3. `release/vX.Y.Z` 브랜치를 origin에 푸시 (`--follow-tags`)
4. Production 워크플로가 해당 브랜치를 배포

## Supabase + AppConnect 설정

이 프로젝트는 인증을 Ellieo(AppConnect) API 세션으로 처리하고, 파일 스토리지는 Supabase를 사용합니다.

필수 환경 변수:

- `APP_CONNECT_API_BASE_URL`: Ellieo API base URL (`https://.../v1/api`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google Identity Services 웹 클라이언트 ID
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 service role key
- `SUPABASE_AVATAR_BUCKET`: 프로필 이미지 버킷 이름 (기본값: `avatars`)
- `ELLIEO_ERP_BASE_URL`: 직장인 인증 알림을 보낼 ERP 주소 (기본값: `https://ellieo.io`)
- `MISAENG_ERP_NOTIFY_SECRET`: ERP `/api/misaeng-admin/notify`와 동일한 공유 시크릿

권장:

- Supabase 버킷 `avatars`는 public URL 조회가 가능해야 합니다.
- Vercel 환경 변수는 `Production/Preview/Development` 모두 동일하게 맞춰 주세요.

## App push notifications (misaeng-app)

- Tables: run `supabase/push.sql` (push_devices, push_preferences, company_follows).
- Env: `APNS_TEAM_ID` (K75A78VM5H); production key `APNS_KEY_ID` + `APNS_KEY`; sandbox key (Xcode builds)
  `APNS_SANDBOX_KEY_ID` + `APNS_SANDBOX_KEY` (contents of the .p8 keys, `\n` for newlines; both keys are
  topic-specific to com.misaeng.nyc); `APNS_BUNDLE_ID` (default `com.misaeng.nyc`); `INTERNAL_PUSH_SECRET` (shared with ellieo-erp).
- Without the APNs env vars nothing is sent; everything else keeps working.
- Sent from: comments (`api/community/[id]/comments`), credits (`lib/community/creditLedger.ts`), and
  ellieo-erp via `POST /api/internal/push` (posting approved, admin credit awards).
