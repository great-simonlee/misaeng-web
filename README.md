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
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
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

## 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

## 배포 (GitHub Actions + Vercel)

Vercel Git 자동 배포는 끄고, GitHub Actions에서 빌드한 산출물을 배포합니다.

### GitHub Secrets

저장소 **Settings → Secrets and variables → Actions**에 아래 값을 넣습니다.

| Secret | 설명 |
|---|---|
| `VERCEL_TOKEN` | [Vercel 토큰](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel 팀(또는 계정) ID |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 ID |

ID는 Vercel 대시보드 **Project Settings → General**의 Project ID, **Team Settings → General**의 Team ID에서 확인할 수 있습니다.

### Preview / Production

| | Preview | Production |
|---|---|---|
| 워크플로 | `.github/workflows/vercel-preview.yml` | `.github/workflows/vercel-production.yml` |
| 트리거 | `feature/ci_cd` push | `release/vX.Y.Z` push (`release/v1.0.0` 형식) |
| 환경 | Vercel Preview 환경 변수 | Vercel Production 환경 변수 |
| URL | 임시 Preview URL | 프로덕션 도메인 |

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

권장:

- Supabase 버킷 `avatars`는 public URL 조회가 가능해야 합니다.
- Vercel 환경 변수는 `Production/Preview/Development` 모두 동일하게 맞춰 주세요.
