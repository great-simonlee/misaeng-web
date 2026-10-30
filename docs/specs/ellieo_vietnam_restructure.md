# Ellieo 베트남 피벗: 구조 설계 문서

작성: 2026-10-30 (체크포인트 1 — 1장만 작성. 2~8장은 체크포인트 2에서 작성)
기준: docs/specs/ellieo_vietnam_pivot_brief.md
조사 방식: 코드 읽기 + 운영 Supabase 읽기 전용 조회(행 수, 분포만) + 공개 URL 응답 확인. 코드·데이터 수정 없음.
조사 기준 코드: 워크트리 `ellieo/vietnam-pivot` = `ff791c4` (misaeng-web 본 체크아웃의 미커밋 작업, 예: 워싱턴 DC 도시 추가 약 50개 파일은 이 조사에 포함되지 않음).

---

## 1. 현재 상태

### 1.1 저장소와 연결 관계

| 저장소 | 경로 | 기술 | 현재 브랜치 | 역할 |
|---|---|---|---|---|
| misaeng-web | ~/Simon/misaeng-web (이 워크트리: ~/Simon/ellieo-website) | Next.js 16, React 19, TS, Tailwind v4 | 본 체크아웃 `feat/multilingual` (미커밋 약 50개), 이 워크트리 `ellieo/vietnam-pivot` | misaeng.com 웹 + 앱용 API 서버. `NEXT_PUBLIC_BRAND`로 ellieo.com도 같은 코드로 빌드하도록 설계됨 |
| misaeng-app | ~/Simon/misaeng-app | SwiftUI (iOS 17+, XcodeGen), `com.misaeng.nyc` | `main` (미커밋 12개) | Misaeng 전용 앱. misaeng.com `/api/*`만 호출. 언어 ko, en |
| ellieo-erp | ~/Simon/ellieo-erp | Next.js 15, JS, Firebase(직원 로그인, Firestore `ellieo-resource-management`) | `feat/content-translations` (미커밋 5개) | 운영 허브. Vercel 프로젝트 `ellieo-erp`, 도메인 ellieo.io(→ www.ellieo.io). Misaeng 관리 탭(Users, Content, Reports, Credits, Points, Workplace, Instagram, Schools, Verifications, Jobs, Translations, Legal, Costs) |
| ellieo-web (옛 마케팅 사이트) | ~/Simon/ellieo-web | Next.js 16, Firestore 읽기 | `main` (미커밋 3개, 마지막 커밋 2026-07-07) | 옛 Ellieo 소개·매물·룸메이트 페이지. 배포 설정 파일 없음 |
| 옛 Ellieo 모바일 앱 | **로컬에 소스 없음** (~/Simon, ~/Desktop 얕은 검색) | 확인 필요 | — | App Store `id6753929020`, Android `com.misaeng.ellieo`. 백엔드는 자체 REST API "AppConnect" (`https://ellieo.com/v1/api`, test: `test.ellieo.com/v1/api`) — API 문서 `ellieo-erp/docs/ellieo-api.md`. 마케팅 자산만 `~/Desktop/temp/ellieo`에 있음 |

연결
- misaeng-web ↔ 운영 Supabase(프로젝트 1개): Postgres 테이블 + Storage JSON 객체(아래 1.3).
- misaeng-web → 옛 Ellieo API(AppConnect): 예전 로그인(`ELLIEO_LEGACY_LOGIN=on`, 기존 회원 첫 로그인 1회 확인), 탈퇴 시 `user/deletion`·`auth/logout` 호출.
- ellieo-erp → Supabase(raw fetch, service role) + misaeng-web 내부 API(`/api/internal/points/*`, `/verifications/*`, `/push`; 비밀키 `INTERNAL_POINTS_SECRET`, `INTERNAL_VERIFICATION_SECRET`, `INTERNAL_PUSH_SECRET`).
- misaeng-web → ERP 알림(`ELLIEO_ERP_BASE_URL`, 기본 https://ellieo.io): 신고, 인증 서류, 직장·인스타 인증, 커피챗 신고.
- misaeng-app → misaeng.com API만 (Supabase 직접 접근 없음).
- ERP 브랜드 인식: 없음. Misaeng 관리 화면은 misaeng.com만 가정한다.

### 1.2 브랜드 환경변수, 도메인, 배포

- 브랜드 설정: `src/lib/brand/index.ts`. `NEXT_PUBLIC_BRAND=ellieo`일 때만 ellieo, 그 외는 misaeng. 빌드 시점 고정.
  - misaeng: 언어 ko(기본), en / 색 #F64310 / `hasCorporateSite: true`.
  - ellieo: 언어 **en(기본), ko, vi, ja, zh-CN, zh-TW, id** / 색 #2f6df6 / `hasCorporateSite: false` / 검색 색인 언어는 ko 제외 전부.
  - `siteUrl`은 `NEXT_PUBLIC_SITE_URL` (기본 https://misaeng.com / https://ellieo.com).
- 라우팅: `src/proxy.ts` (Next 16 proxy). Ellieo `/` → `/nyc`. Ellieo의 회사 페이지(about, careers, contact, credit, privacy, terms 등) → misaeng.com으로 308. 기본 언어는 접두어 없음, 그 외 `/{locale}/nyc/...`. 미지원 언어 → fallback으로 308. 요청 호스트(도메인)로 분기하지 않음.
- 도시: `CITY_IDS = ['nyc','boston']` (`src/lib/constants/cities.ts`, 라벨 "MISAENG NYC" 하드코딩). 본 체크아웃 미커밋분에 DC 추가 작업 있음(이 워크트리에 없음).
- 배포 현황 (2026-10-30 확인)
  - **misaeng.com**: Vercel이 아니라 **AWS 서버(nginx, bastion 경유)**. devlog 기준 `release/v0.0.x` 브랜치 push로 반영되는 구조(마지막 `release/v0.0.24`). 서버 배포 스크립트 자체는 이 저장소에 없음 → 상세 확인 필요.
  - **Vercel**: `vercel.json`이 git 자동 배포를 끔. `.github/workflows/vercel-preview.yml`이 main 외 브랜치 push마다 misaeng/ellieo 매트릭스로 **preview만** 배포. GitHub secret에 `VERCEL_PROJECT_ID_ELLIEO`가 **없음** → ellieo 프리뷰는 매번 건너뜀. 즉 **Ellieo용 Vercel 프로젝트는 아직 없음(또는 연결 안 됨)**. 최근 `release/v0.0.24` 프리뷰 run 1건 실패.
  - **ellieo.com (현재)**: nginx가 응답, 제목 "Misaeng – Ellieo | Verified Housing for New York City Students & Professionals". 어느 코드(옛 ellieo-web인지 misaeng-web 회사 레이아웃인지)가 서비스 중인지 확인 필요.
  - **중요**: 옛 Ellieo 앱 API가 **같은 도메인 `ellieo.com/v1/api`** 를 쓴다. ellieo.com을 새 웹으로 옮길 때 `/v1/api` 경로를 기존 서버로 계속 보내지 않으면 옛 앱과 Misaeng의 예전 로그인 확인이 끊긴다.
  - `test.ellieo.com/v1/api`는 502 응답(조사 시점).
  - ellieo-erp: Vercel `ellieo-erp`, ellieo.io.
- 브랜치 상태: `origin/main`(3efb2f0, 10-26, 워크플로만) / `origin/develop`(8월 이후 정지) / 실제 개발은 `feat/multilingual` → `release/v0.0.24`. 운영 브랜치가 하나로 정리돼 있지 않음 (devlog 10-25에도 지적됨).
- staging: **없음**. Supabase 프로젝트는 운영 1개뿐(코드·env에 staging ref 없음). `supabase/points.sql`, `src/lib/points/WIRING.md`는 "staging 먼저"라고 적혀 있으나 실제로는 운영에 바로 실행됨(devlog 10-26).
- 보안 메모: GitHub **Variables**(Secrets 아님)의 `APP_ENV_JSON`에 Supabase service role key가 들어 있음 (devlog 10-26에도 "교체 필요"로 기록).

### 1.3 데이터 저장 방식 (운영 Supabase, 읽기 전용 조회)

운영 Supabase 1개를 Misaeng이 쓴다. 데이터의 상당 부분이 Postgres 테이블이 아니라 **Storage 버킷 안의 JSON 파일**이다.

| 데이터 | 저장 위치 | 운영 수량 (2026-10-30) |
|---|---|---|
| 로그인 계정 | Supabase Auth `auth.users` + `auth_accounts`(uid 연결) | auth.users 3, auth_accounts 3 |
| 옛 Ellieo 계정에서 옮긴 회원 | `legacy_users` | 38 (source 전부 profile) |
| 프로필 | Storage `avatars/{uid}/profile.json` | 40 |
| 게시글 | Storage `housing/community/{id}.json` | 19 (아래) |
| 댓글·참여·인증 요청 | Storage `housing/community-comments/`, `community-engagement/`, `community-workplace-verifications/` 등 | 미집계 |
| 하우징 매물 | Storage `housing/listings/{id}.json` (ERP Firestore 매물의 복사본) | 15 (open 9, closed 6), `city` 값 없음 |
| 동의 기록 | Storage `housing/legal/consent-logs/`, `consent-latest/` | 41 / 40 |
| 포인트 | `point_ledger` 외 (Postgres) | ledger 7행, `points.cutover_at` 2026-10-27 |
| 회사 | `companies` (Postgres, 스키마는 ellieo-erp/supabase) | 131 |
| 채용 공고 | `job_postings` | 18 |
| 신고 | `community_reports` | 0 |
| 푸시 기기 | `push_devices` | 3 (전부 app=misaeng, ko, ios) |

- 운영 DB에 **없는** 테이블: `consent_logs`(SQL 파일은 있으나 미적용, 실제 기록은 Storage JSON), `verification_school_domains`, `verification_blocked_domains`, `account_verifications`, `school_domain_requests`, `profiles`, 게시글·매물 테이블.
- 게시글 19개: nyc/food 6, (city 없음)/food 4, job-review 6, status 1, anonymous 2. `sourceLocale` 있는 글 4개(ko), 번역본 0개.
- 프로필 40개: `preferredLocale` 설정 1명(ko), 나머지 미설정. 동의 시 UI 언어(`consentUiLanguage`) ko 18 / en 22. 학교 인증 7명, 직장 인증 승인 2명.
- 동의 기록의 `brand` 값: misaeng 3, 없음 38. **ellieo 브랜드 동의 0건**.

### 1.4 계정, 인증, 포인트, 동의의 브랜드 분리 현황

- 계정: **브랜드 공유 전제**. 사용자 레코드에 `signup_brand` 없음. `preferredLocale`은 프로필 JSON에 있음(`PreferredLocaleSync`, PATCH `/api/agent-auth/profile`). 무료 열람 한도도 "계정당(Misaeng + Ellieo)"으로 주석 처리돼 있음.
- 로그인: `MISAENG_AUTH_PROVIDER=supabase`(운영 적용, 10-28). 이메일·Google·Apple. 이메일 코드는 Resend(`no-reply@misaeng.com`). 메일 발신자·문구가 Misaeng 기준 → Ellieo용 발신 도메인 확인 필요.
- 학교 인증
  - `verification_school_domains` **테이블 없음**. 코드 내장 목록 `src/lib/constants/schools.ts`(13개 학교: NYU, FIT, New School, SVA, Baruch, Stony Brook, Buffalo, Binghamton, Pace, Fordham, Monroe 등 — **뉴욕주 학교 포함, NYC만이 아님**; NYU 도메인 목록에 `misaeng.com` 포함)를 ERP Schools 탭의 Storage JSON `school-registry/schools.json`이 덮어쓰는 구조. 운영 버킷 housing/avatars의 해당 경로에서는 파일을 찾지 못함 → 실제 위치·학교 수 확인 필요.
  - 지역(region)·도시·브랜드 칼럼 없음 → 브랜드별 허용 지역 설정 불가.
  - 학교 추가 요청: Storage `school-registration-requests/<id>.json` + 메일.
  - 학교 최대 3개 인증. 1년 재확인·만료 **없음**.
- 직장 인증: 정적 개인 메일 차단 목록(`src/lib/constants/workplace.ts`) → 인증 코드 → 사용자가 회사명 입력 → **ERP 수동 심사**(Storage `community-workplace-verifications/`). 일회용 메일 차단, MX·WHOIS 확인, 회사 목록 자동 승인, 급증 보류, 1년 재확인 **없음**. `companies`의 `website_domain`은 있으나 인증과 연결되지 않음.
- 인스타그램 인증: 있음(@misaeng.ny DM, ERP 수동 승인). 브랜드 구분 없음 → Ellieo에서 숨겨야 함.
- 배지: 학교명, 직장 인증, 인스타 인증. 회사명 공개 여부 선택 기능은 확인 필요.
- 포인트: `point_rules`, `point_settings`, `point_ledger`(append-only), `point_balances`, `point_holds`, `point_claims`, `content_unlocks`, `daily_checkins`, `point_post_boosts`, `point_identities`. **brand 필드 없음**. 등급 없음, 신고 보상 없음. 표시 이름은 `points.nameEllieo` 키로 브랜드 분기만 있음.
- 동의: Storage JSON 기록에는 `brand`(misaeng|ellieo)와 `ui_language`(7개 언어) 필드가 있음. 재동의는 ERP Legal 탭(material/minor 버전).
- **후기의 "번역 게시"·"구독 콘텐츠 포함" 동의 플래그: 코드·데이터 어디에도 없음.** misaeng_points_spec.md 6.3에만 선택 동의 항목으로 정의돼 있고 구현되지 않음.

### 1.5 i18n, 언어별 라우팅, 번역 저장과 배치

- 언어 목록: `src/lib/i18n/locales.ts` `LOCALES = en, ko, vi, ja, zh-CN, zh-TW, id`. 쿠키 `misaeng_locale`. Accept-Language 자동 이동 없음(의도). API는 `x-locale` 헤더 → Referer → 쿠키 순.
- 문구 파일: `src/messages/{locale}/{namespace}.json`, 16개 네임스페이스, 7개 언어 모두 존재(**vi 이미 있음** — 기계 번역 여부·검수 상태 확인 필요). 빠진 키는 ko → en → locale 순으로 대체.
- 법무 문서 번역: `src/lib/legal/translations/{terms,privacy}.{id,ja,vi,zh-CN,zh-TW}.json` + `scripts/legal-translation-source.mjs`.
- 언어 선택 UI: `src/widgets/LanguageMenu.tsx`, `LanguagePicker.tsx` (둘 다 `BRAND_CONFIG.serviceLocales` 사용), `TranslationNotice.tsx`.
- 사용자 콘텐츠 번역: 게시글 JSON 안에 `sourceLocale`, `translations: {locale: {segments, sourceHash, by, at}}`, `translationReview` 저장 (`src/lib/translations/content.ts`, ERP `util/contentTranslations.mjs`와 쌍둥이). 채용 공고는 `job_postings.summary_translations`.
- 번역 배치: misaeng-web에는 없음. **ERP Translations 탭에서 claude.ai에 수동 복사·붙여넣기**(API 호출 없음), 대상 7개 언어. 현재 운영 번역본 0개.
- `localize.server.ts`의 "번역 전 숨김"은 misaeng/ko에만 적용.
- 성조 무시 검색: **없음**. 검색은 클라이언트 `toLowerCase` + `includes` (CommunityListScreen, PostingListScreen). 서버 검색·`unaccent` 없음.
- 날짜·숫자: `src/lib/i18n/format.ts`(Intl, locale 기반). 단 하우징·룸메이트·공고 일부는 `'en-US'` 하드코딩, `lib/housing/listing.ts`에 한국어 "크레딧" 문자열 하드코딩.

### 1.6 하우징 매물과 리드 출처

- 매물: ERP Firestore(Property + Unit) → ERP "What to Post → Misaeng 등록"으로 Storage `listings/{id}.json` 스냅샷 생성 (`sourcePropertyId`, `sourceUnitId`). Sync는 가격·프로모션만 반영. 사용자 매물 등록은 비활성.
- `listings` JSON에 `city` 값이 없음(15개 전부). 언어별 필드 없음, 설명 번역본 없음.
- **문의: 단순 `mailto:` 링크(기본 housing@misaeng.com). 리드 기록·리드 출처·브랜드 필드 없음.** ERP에 브로커리지 리드 화면 없음.
- **부동산 라이선스·소속 브로커리지 표시 없음.** "no broker fee" 태그만 있음.
- 룸메이트·서블렛: 커뮤니티 게시판 `roommate`(Storage JSON), 상단 노출(포인트 50) 있음. 운영 게시글 중 roommate 카테고리 0개.
- 옛 Ellieo 앱의 렌트·룸메이트 매칭 데이터: AppConnect API(`rent`, `match`)에 있음. 접근 권한이 없어 수량 확인 필요. ellieo-web은 Firestore `properties`, `clientBoardWaiting`을 읽지만 공개 API 키로는 권한 거부.

### 1.7 커뮤니티 게시판과 신고

- 게시판(`src/lib/constants/nyc.ts`): housing, events, food, marketplace(준비 중), status(CPT·OPT·비자·영주권 통합), job-review, roommate, anonymous.
- 게시글은 `city`, `categoryId`로만 구분. **브랜드 구분 없음** → 브리프의 "커뮤니티 브랜드별 완전 분리"를 위해 brand 필드 또는 별도 저장 위치가 필요.
- 질문 게시판 없음(anonymous가 가장 가까움).
- 신고: `community_reports`(사유 spam, abuse, inappropriate, misinformation, privacy, other / 상태 open, reviewed, resolved, dismissed). 신고자 3명이면 자동 숨김(`AUTO_HIDE_REPORTERS`, 하드코딩), 신고자 본인에게는 즉시 숨김. ERP Reports 탭은 24시간 경과 경고. **SLA config 없음**, 약관 문구에 "24시간 검토"가 7개 언어로 들어가 있음(브리프 초기값 48시간과 다름). 사기 의심 유형, 개인정보 즉시 비공개, 신고자 처리 상태 표시, 월간 통계 **없음**.

### 1.8 구독·결제

- Stripe 등 결제 코드 **없음**, 구독 테이블 **없음**.
- 열람 잠금(포인트): `paywall.enabled=false`, `paywall.start_date=2027-03-01`, `paywall.notice_days=21`. 무료 열람 5회 후 10포인트. 면접·비자 후기만 잠금 대상. `content_unlocks.method`에 `subscription` 값만 예약됨.

### 1.9 이벤트·지표

- `usage_daily(day, metric, count)`는 Google Places 호출·지도 조회 같은 비용 카운터만 (0행). brand·locale·platform 필드 없음. 분석 SDK(GA, PostHog 등) 없음. Ellieo 대시보드 지표를 낼 기반 없음.

### 1.10 웹 디자인 시스템

- Tailwind v4, 설정 파일 없이 `src/app/globals.css` 토큰. `<html data-brand>`(`src/widgets/RootDocument.tsx`)로 `[data-brand='ellieo']` 블록이 **색만** 덮어씀. 로고·글꼴·간격은 브랜드별 토큰 없음. `.animate-shimmer`는 주황 하드코딩, 일부 컴포넌트는 `BRAND_CONFIG.id === 'misaeng'` 직접 분기.
- 글꼴: Pretendard(로컬), Noto Sans JP/SC/TC(`:lang`), Geist Mono. **Be Vietnam Pro 없음**. Pretendard의 베트남어 성조 기호 지원 여부 확인 필요.
- 폴더: `src/components`(공통 UI), `src/widgets`(헤더·푸터·언어), `src/screens/nyc/*`(화면), `src/hooks`, `src/lib`.
- PWA manifest **없음**, sitemap·robots **없음**. OG 이미지는 두 브랜드가 같은 정적 파일(`src/app/opengraph-image.png`) 공유. 회사 레이아웃 메타데이터는 "Misaeng – Ellieo"·misaeng.com 하드코딩.
- 브랜드 테마 분리: 색 단위로만 가능. 로고·글꼴·간격까지 분리하려면 토큰 확장 필요.

### 1.11 기존 Ellieo 앱 사용자와 데이터

| 항목 | 결과 |
|---|---|
| 옛 Ellieo 앱 전체 사용자 수 | **확인 필요** (AppConnect 백엔드 DB 접근 권한 없음. Ellieo 백엔드 담당자에게 요청 필요) |
| 가입 언어 분포 | **확인 필요** (앱 지원 언어도 확인 못 함) |
| 렌트 매물·룸메이트 데이터 수 | **확인 필요** (AppConnect `rent`, `match`; Firestore는 권한 거부) |
| Misaeng으로 옮긴 옛 Ellieo 회원 | `legacy_users` 38명 |

### 1.12 Misaeng 후기 중 Ellieo 노출 가능한 글

- 운영 후기: job-review 6, status(비자) 1 = 7개.
- "번역 게시"·"구독 콘텐츠 포함" 동의 필드가 없으므로 **두 동의를 모두 받은 글은 0개**. 국적 무관 유용 글 수는 동의 대상이 0이라 산정 불가(7개 내용 분류는 확인 필요).
- 따라서 브리프 5장 "첫 방문자가 볼 동의받은 Misaeng 후기 번역본"은 현재 데이터로는 비어 있다. 기존 작성자에게 동의를 다시 받는 흐름이 필요하다.

### 1.13 기존 사양과의 충돌

| 사양 | 내용 | 이번 개편과 충돌 |
|---|---|---|
| misaeng_points_spec.md 1.1 | ellieo.com ko 표시 이름 "(미정, Ellieo Points)" | Ellieo는 vi "Điểm Ellieo", en "Ellieo Points". ko 없음 |
| misaeng_points_spec.md 2.2 | `point_ledger`에 brand 없음 | 브리프 추천안은 브랜드별 원장 분리(brand 필드) |
| misaeng_points_spec.md 2.6, 3.1, 3.1.1 | 인스타그램 인증(포인트 5, 웰컴 선지급 10), 인증 합계 45 | Ellieo는 인스타그램 인증 없음 → Ellieo 인증 포인트 상한·웰컴 규칙 별도 필요 |
| misaeng_points_spec.md 3.1.1 | 직장 이메일 "자동(인증 코드 메일)" | 브리프는 강한 회사 인증(자동 거절·MX·WHOIS·회사 목록 자동 승인·수동 심사). 현재 코드는 전부 수동 심사 |
| misaeng_points_spec.md 3.1.2 | `verification_school_domains.region`: NYC, NY Metro, NY State, Boston. 브랜드 칼럼 없음 | Ellieo는 NYC만 허용, 브랜드별 허용 지역 설정 필요 |
| misaeng_points_spec.md 4.3 / point_settings | 유료 전환 2027-03-01 가정 | Ellieo는 "사용자가 충분히 모인 뒤" config로 전환. 브랜드별 전환일 분리 필요 |
| misaeng_points_spec.md 6.3 | 후기 선택 동의 3개(ellieo.com 번역 게시, AI 답변 근거, 구독 콘텐츠 포함) | 일치하지만 미구현. 브리프는 두 동의 모두 필요 조건 |
| misaeng_points_spec.md 3장 | 신고 보상 규칙 없음 | 브리프는 "확정 삭제 시 신고자 포인트 지급(points spec 기준)" → points spec에 해당 규칙이 없음 |
| misaeng_points_spec.md | 등급 시스템 정의 없음 | 브리프 6장은 "등급" 포함 |
| 2026-10-23 합의 설계 (메모: Misaeng/Ellieo i18n) | Ellieo = en 기본 + ko, vi, ja, zh-CN, zh-TW, id 7개 언어, ko는 misaeng으로 canonical, ERP 7개 언어 번역 배치 | 브리프: vi 기본 + en만, 나머지 언어 삭제. **현재 코드는 옛 합의(7개 언어, en 기본)대로 구현됨** |
| 현재 약관 문구 | 신고 "24시간 검토" (7개 언어, 하드코딩) | 브리프 초기 약속 48/72시간, config 연동 |
| translation_feature_spec.md | 파일 없음 | **확인 필요** (~/Simon, ~/Desktop, ~/Downloads 검색 결과 없음) |
| immigration_info_spec.md | 파일 없음 | **확인 필요** |

### 1.14 확인 필요 (이 장 기준)

1. 옛 Ellieo 앱 사용자 수, 가입 언어 분포, 렌트·룸메이트 데이터 수 (AppConnect 백엔드 접근 필요)
2. 옛 Ellieo 앱 소스 위치와 지원 언어
3. 현재 ellieo.com을 서비스하는 코드와 서버(nginx), `/v1/api`와 같은 서버인지
4. misaeng.com AWS 배포 절차(어느 브랜치가 언제 반영되는지)
5. ERP 학교 목록 `school-registry/schools.json`의 실제 저장 위치와 학교 수
6. 현재 vi 문구·법무 번역의 출처(기계 번역 여부)와 검수 여부
7. Pretendard의 베트남어 성조 기호 지원
8. Ellieo용 이메일 발신 도메인(Resend)과 Apple/Google 로그인 설정(현재 Misaeng 기준)
9. translation_feature_spec.md, immigration_info_spec.md 원본
10. 운영 후기 7개 중 국적 무관 유용 글 분류
