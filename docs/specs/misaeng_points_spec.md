# 미생 포인트 (Misaeng Points) 개발 사양서

작성일: 2026-10-26
대상: misaeng-web (Next.js 16, Supabase), misaeng-app (SwiftUI), ellieo-erp
용도: Claude Code에 그대로 전달해 구현하기 위한 기준 문서

이 문서의 결정이 기존 "크레딧" 관련 코드, 문구, 기획 문서보다 우선한다.

---

## 0. 원칙 (변경 금지)

1. 포인트는 판매하지 않는다. 현금 가치가 없고, 환불, 환전, 양도, 사용자 간 이동이 불가능하다.
2. 포인트는 기여(글 작성, 인증, 참여)로만 적립된다. 결제로 포인트를 지급하지 않는다.
3. 결제(구독, 패스)는 Misaeng이 가진 콘텐츠와 기능을 연다. 포인트는 사람의 시간(커피챗, 멘토 서비스)을 연다. 멘토의 시간은 돈으로 살 수 없다.
4. 멘토와 커피챗 상대에게 Misaeng은 어떤 금전적 보상도 하지 않으며, 레퍼럴을 보장하지 않고, 레퍼럴 보너스에서 어떤 몫도 받지 않는다.
5. 법률 서비스(변호사 상담 예약, 소개, 포인트 교환)는 포인트 사용처에 포함하지 않는다. 기존 "이민 변호사 자문" 사용처는 제거한다.
6. 인증 서류는 확인 후 정해진 기간 안에 반드시 삭제하고, 삭제 사실을 사용자와 운영진 모두가 확인할 수 있어야 한다.
7. 모든 수치(적립량, 차감량, 상한)는 코드에 하드코딩하지 않고 서버 설정에서 내려준다.

---

## 1. 이름 변경: 크레딧 → 미생 포인트

### 1.1 표시 이름

| 위치 | ko | en |
|---|---|---|
| misaeng.com | 미생 포인트 | Misaeng Points |
| ellieo.com | (미정, 기본값 Ellieo Points) | Ellieo Points |

- 표시 이름은 브랜드 환경변수와 i18n 키로 처리한다. 키: `points.name`
- 잔액은 두 브랜드가 하나를 공유한다. 잔액 화면에 안내 문구를 표시한다.
  - ko: "미생 포인트는 Ellieo와 공유됩니다."
  - en: "Your points are shared between Misaeng and Ellieo."
- 번역 용어집 고정: ko 포인트, en Points, ja ポイント, zh-CN 积分, zh-TW 積分, vi điểm, id poin. "credit", "信用", "tín dụng", "クレジット" 사용 금지.

### 1.2 변경 대상 (전수 교체)

- 웹 회사 페이지 `/credit` → `/points` (301 리다이렉트 유지)
- 마이페이지 "크레딧 내역", "사용 요청" 문구
- 앱 공용 문구 파일 (웹과 앱이 공유하는 생성 파일)
- 푸시 알림 문구 ("포인트 지급")
- 온보딩 퀴즈 (new_user_onboarding_quiz.json)
- 약관, 개인정보처리방침 (3장)
- 번역 배치 프롬프트와 용어집
- 기획 문서: translation_feature_spec.md, immigration_info_spec.md

### 1.3 DB 명명

- 신규 테이블과 컬럼은 `points` 기준으로 작성한다.
- 기존 credit 관련 테이블이 있으면 마이그레이션으로 이름을 바꾸고, 전환 기간 동안 구 이름으로 읽기 전용 view를 둔다. 이중 쓰기 후 롤백 가능한 방식으로 진행한다 (기존 게시글 저장소 이전과 같은 방식).

---

## 2. 데이터 모델 (Supabase)

### 2.1 설정

```sql
create table point_rules (
  key text primary key,            -- 예: 'earn.interview.base'
  value integer not null,
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table point_settings (
  key text primary key,            -- 예: 'paywall.enabled', 'paywall.start_date'
  value jsonb not null,
  updated_at timestamptz not null default now()
);
```

- 웹과 앱은 `GET /api/points/config` 로 규칙을 받아 화면에 표시한다 (후기 작성 화면 상단 보상 안내 포함).
- ERP에 규칙 편집 화면을 둔다. 변경 이력은 `point_rules_history` 에 남긴다.

### 2.2 원장 (append-only)

```sql
create type point_entry_type as enum ('earn', 'spend', 'hold', 'release', 'clawback', 'adjust');

create table point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  entry_type point_entry_type not null,
  amount integer not null,          -- 적립 +, 차감 -
  reason text not null,             -- 예: 'interview_review', 'review_unlock', 'coffee_chat'
  source_type text,                 -- 'post', 'comment', 'verification', 'coffee_chat', 'unlock' 등
  source_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid,                  -- 시스템 또는 관리자
  note text
);

create view point_balances as
  select user_id, coalesce(sum(amount), 0) as balance
  from point_ledger group by user_id;
```

- 원장 행은 수정, 삭제하지 않는다. 정정은 `adjust` 또는 `clawback` 행을 추가한다.
- 모든 적립과 차감은 `idempotency_key` 로 중복을 막는다. 예: `earn:post:{post_id}:base`, `unlock:{user_id}:{post_id}`
- 잔액이 음수가 되는 차감은 DB 함수에서 거부한다 (`spend_points()` RPC, row lock 사용).
- RLS: 사용자는 본인 원장만 읽기 가능. 쓰기는 서버(service role)만.

### 2.3 적립 심사 대기

```sql
create type claim_status as enum ('pending', 'approved', 'rejected', 'expired');

create table point_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  post_id uuid not null,
  board text not null,              -- 'interview', 'visa', 'food'
  requested jsonb not null,         -- {"base":20,"detail":15,"verified":15}
  ai_prescreen jsonb,               -- Claude 1차 판정 결과
  status claim_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
```

- 글 작성 즉시 포인트를 주지 않고 `point_claims` 에 pending으로 넣는다.
- ERP 심사 승인 시 원장에 `earn` 행을 추가하고 푸시 알림을 보낸다.

### 2.4 열람 기록

```sql
create table content_unlocks (
  user_id uuid not null,
  post_id uuid not null,
  method text not null,             -- 'free_quota', 'points', 'subscription', 'free_period'
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
```

- 한 번 연 글은 다시 차감하지 않는다. 원문과 번역본은 같은 `post_id` 로 처리한다.

### 2.5 기타

```sql
create table daily_checkins (
  user_id uuid not null,
  checkin_date date not null,       -- 사용자 표준 시간대가 아닌 America/New_York 기준
  primary key (user_id, checkin_date)
);

create table point_holds (          -- 커피챗 등 완료 후 차감
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount integer not null,
  source_type text not null,
  source_id uuid not null,
  status text not null default 'held',  -- held, captured, released
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

### 2.6 계정 인증

```sql
create type account_verification_kind as enum ('school_email', 'work_email', 'instagram');

create table account_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind account_verification_kind not null,
  identifier_normalized text not null,   -- 정규화된 이메일 또는 인스타그램 계정명
  domain text,                           -- 이메일 도메인 (학교명, 회사명 매칭용)
  status text not null default 'pending', -- pending, approved, rejected, expired
  verify_code text,                      -- 인스타그램 DM 코드 (승인 후 null 처리)
  code_expires_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,                      -- 인스타그램 수동 승인자. 이메일은 null(시스템)
  expires_at timestamptz,                -- 학교 인증 1년
  created_at timestamptz not null default now(),
  unique (kind, identifier_normalized)   -- 같은 이메일/계정명은 한 계정에만
);
```

- 인스타그램 승인은 ERP의 "인스타그램 인증" 큐에서만 처리한다. 승인 시 처리자와 일시가 기록되고, 같은 트랜잭션에서 포인트 지급이 실행된다.
- 계정 탈퇴가 확정되면 identifier_normalized를 지우고, 서버 비밀키를 쓰는 HMAC-SHA256 값만 `deleted_identity_hashes` 에 12개월 보관한다. 일반 SHA-256은 이메일 목록으로 역추적이 가능하므로 쓰지 않는다. 상세 규칙은 10장.

---

## 3. 적립 규칙

모든 값은 `point_rules` 초기값이다.

### 3.1 가입과 참여

| key | 값 | 조건 |
|---|---|---|
| earn.verify_first_email | 30 | 웰컴 포인트. 학교 또는 직장 이메일 첫 인증 시 계정당 1회 |
| earn.verify_second_email | 10 | 첫 인증과 다른 종류의 이메일 추가 인증 시 계정당 1회 (예: 학교 인증 후 졸업하고 직장 이메일 인증) |
| earn.verify_instagram | 5 | 인스타그램 DM 인증 승인 시 계정당 1회 |
| earn.welcome_instagram_only | 10 | 이메일 인증 없이 인스타그램만 인증한 경우 웰컴 포인트 일부 선지급. 이후 첫 이메일 인증 시 earn.verify_first_email에서 이 값을 뺀 20만 지급 |
| earn.onboarding_quiz | 10 | 온보딩 퀴즈 전 문항 정답 시 1회 |
| earn.profile_complete | 5 | 프로필 필수 항목 완성 시 1회 |
| earn.checkin | 1 | 하루 1회. 인증 계정만 (3.1.1 기준) |
| earn.checkin_streak7 | 3 | 7일 연속 시 |
| cap.checkin_monthly | 30 | 출석 관련 월 최대 |
| earn.referral | 20 | 피추천인이 학교 또는 직장 이메일 인증을 완료했을 때 추천인에게. 인스타그램 인증만으로는 지급 안 함 |
| cap.referral_monthly | 5 | 월 최대 인원 |

### 3.1.1 계정 인증 규칙

인증 종류와 성격

| 종류 | 증명 내용 | 처리 방식 | 배지 |
|---|---|---|---|
| 학교 이메일 | 재학생 신분 | 자동 (인증 코드 메일) | 학생 인증 |
| 직장 이메일 | 현직자 신분 | 자동 (인증 코드 메일) | 직장인 인증 |
| 인스타그램 DM | 실제 사용자 여부 | 수동 (운영자가 ERP에서 승인) | 기본 인증 |

인증 포인트 한도
- 한 계정이 인증으로 받을 수 있는 포인트는 최대 45 (이메일 첫 인증 30 + 두 번째 이메일 10 + 인스타그램 5).
- 인스타그램을 먼저 인증한 경우: 인스타그램 5 + 선지급 웰컴 10, 이후 이메일 인증 시 20, 추가 이메일 인증 시 10. 합계는 동일하게 45.
- 재인증(만료 후 다시 인증, 이메일 변경)에는 포인트를 다시 지급하지 않는다. idempotency_key는 `verify:{user_id}:{kind}` 로 고정한다.

"인증 계정"의 정의 (출석, 후기 포인트, 열람 등에 사용)
- 학교 또는 직장 이메일 인증 계정: 모든 적립과 사용 가능.
- 인스타그램만 인증한 계정: 출석, 댓글, 맛집 후기 적립 가능. 면접·취업, 비자 후기 적립과 커피챗 신청은 이메일 인증 후 가능.
- 미인증 계정: 열람만 가능 (무료 한도 내). 적립 없음.

남용 방지
- 학교 이메일과 직장 이메일은 각각 하나의 계정에만 연결된다. 이미 사용된 이메일은 다른 계정에서 인증할 수 없다.
- 이메일은 정규화해서 비교한다 (소문자, Gmail 계열 점과 +태그 제거).
- 학교 이메일: ERP에서 관리하는 허용 학교 도메인 목록(`verification_school_domains`, 3.1.2)에 있는 학교만 인정한다. 초기 목록은 뉴욕과 보스턴 지역 대학교. 목록에 없는 학교 학생은 "학교 추가 요청"을 보낼 수 있다.
- 직장 이메일: 회사 도메인만 인정. 개인 메일(gmail, outlook, yahoo, icloud, naver, daum 등)과 일회용 메일 도메인은 차단 목록(`verification_blocked_domains`)으로 거부. 차단 목록도 ERP에서 관리한다.
- 인스타그램: 계정 생성 기간, 게시물 수, 공개 여부 같은 별도 품질 기준은 두지 않는다. 확인하는 것은 두 가지뿐이다. DM으로 받은 코드가 발급한 코드와 일치하는지, 그 인스타그램 계정이 다른 미생 계정에 이미 연결되어 있지 않은지. 운영자가 명백한 스팸이나 사칭 계정으로 판단한 경우에만 사유를 기록하고 거절한다.
- 학교 인증은 1년마다 재확인. 졸업 등으로 확인이 안 되면 학생 배지만 만료되고 포인트는 회수하지 않는다. 만료 30일 전 직장 이메일 인증을 안내한다.

인스타그램 인증 운영 원칙
- 공식 계정 팔로우를 포인트 조건으로 만들지 않는다. 포인트는 인증 승인에 대해 지급한다. 화면 문구에도 "팔로우하면 포인트" 같은 표현을 쓰지 않는다.
- DM으로는 본인 확인용 메시지(미생 아이디, 인증 코드)만 받는다. 서류, 사진, 서류 스크린샷은 DM으로 받지 않으며, 받은 경우 즉시 삭제하고 업로드 시스템(5장)으로 안내한다.
- 인증 절차: 사용자가 앱 또는 웹에서 인스타그램 인증을 신청하면 6자리 코드를 발급한다. 사용자가 공식 계정에 DM으로 코드를 보내면 운영자가 ERP에서 코드와 계정명을 대조해 승인한다. 코드는 48시간 후 만료.

### 3.1.2 학교 도메인 관리 (ellieo-erp)

초기 데이터: `school_domains_seed.csv` (뉴욕시, 뉴욕 근교, 뉴욕주 주요 대학, 보스턴 지역 대학)

```sql
create table verification_school_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,          -- 소문자. 예: 'nyu.edu'
  match_subdomains boolean not null default true,
  school_name_en text not null,
  school_name_ko text not null,
  city text,
  state text,
  region text not null,                 -- 'NYC', 'NY Metro', 'NY State', 'Boston' (도시 확장 시 추가)
  status text not null default 'active', -- active, inactive
  mx_checked_at timestamptz,
  mx_ok boolean,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table verification_school_domains_history (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null,
  action text not null,                 -- create, update, deactivate, reactivate, delete
  before jsonb,
  after jsonb,
  changed_by uuid not null,
  changed_at timestamptz not null default now()
);

create table school_domain_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_domain text not null,
  school_name text not null,
  status text not null default 'pending', -- pending, approved, rejected
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
```

매칭 규칙
- 이메일 도메인을 소문자로 바꾼 뒤, 정확히 일치하는 행 또는 `match_subdomains = true` 인 상위 도메인 행을 찾는다. 예: `login.cuny.edu` → `cuny.edu`, `g.harvard.edu` → `harvard.edu`.
- 여러 행이 맞으면 가장 긴 도메인이 우선한다. 예: `tc.columbia.edu` 는 Teachers College로, 나머지 `columbia.edu` 하위 도메인은 Columbia로 표시.
- `status = inactive` 인 행은 신규 인증에 쓰지 않는다. 이미 인증된 사용자는 연 1회 재확인 시점까지 유지한다.
- 같은 규칙과 같은 관리 방식으로 `verification_blocked_domains` (개인 메일, 일회용 메일)를 운영한다.

ERP 화면 (설정 > 학교 도메인)
- 목록: 검색, 지역·상태 필터, 학교별 인증 사용자 수 표시.
- 추가와 수정: 도메인, 하위 도메인 포함 여부, 영문·한글 학교명, 도시, 주, 지역, 메모.
- 비활성화와 재활성화: 기본은 비활성화(소프트 삭제). 완전 삭제는 인증 사용자가 0명인 행만 가능.
- CSV 가져오기와 내보내기: 새 도시 확장 시 일괄 추가용. 가져오기 전 미리보기와 중복 검사.
- 이메일 테스트: 이메일 주소를 입력하면 어떤 행에 매칭되는지, 허용인지 차단인지 보여준다.
- MX 확인: 도메인에 메일 서버(MX 레코드)가 있는지 확인하는 버튼과 주간 자동 점검. 실패한 행은 강조 표시.
- 학교 추가 요청 큐: 사용자가 보낸 요청을 승인하면 도메인이 추가되고 요청자에게 알림을 보낸다.
- 모든 변경은 history 테이블에 기록되고, 변경자와 이전 값을 화면에서 볼 수 있다.

반영 방식
- 웹과 앱은 도메인 목록을 직접 갖지 않는다. 인증 판정은 서버에서만 한다.
- ERP에서 변경하면 서버 캐시를 즉시 무효화한다.
- 시드 데이터의 도메인과 한글 학교명은 출시 전 한 번 검수한다. 특히 학생용 메일이 본교 도메인과 다른 학교(CUNY, Northeastern, Yeshiva 등)는 실제 학생 메일 주소로 테스트한다.

### 3.2 게시판

| 게시판 | base | detail | verified | pick |
|---|---|---|---|---|
| 면접·취업 | 20 | 15 | 15 | 20 |
| OPT·비자·영주권 | 20 | 15 | 15 | 20 |
| 맛집 | 5 | 0 | 0 | 5 |
| 익명 | 0 | 0 | 0 | 0 |
| 룸메이트·서블렛 | 0 | 0 | 0 | 0 |

- detail: 게시판별 필수 구조 항목이 모두 채워졌을 때 자동 부여.
  - 면접·취업: 회사, 직무, 지원 경로, 전형 단계, 단계별 기간, 질문 유형, 결과, 인턴/정규직
  - 비자: 비자 유형, 학교(선택), 신청일, 승인일, 준비 서류 목록, 진행 단계
- verified: 4장 인증 승인 시 부여.
- pick: 운영진이 ERP에서 "미생 Pick" 지정 시 부여.
- 후기가 없는 회사의 첫 면접·취업 후기: `earn.first_company_review` = 30 추가.

### 3.3 댓글

| key | 값 | 조건 |
|---|---|---|
| earn.comment | 1 | 최소 글자 수 `rule.comment_min_chars` 충족 |
| cap.comment_daily | 5 | 하루 최대 |
| earn.accepted_answer | 5 | 질문 작성자 또는 운영진이 채택 |

### 3.4 파밍 방지

- 중복 제한: 면접·취업은 (user, company_id, role_id, cycle) 조합당 1개, 비자는 (user, visa_type, cycle) 조합당 1개만 포인트 대상. `cycle` 은 신청 연도와 시즌(spring, summer, fall, winter).
- 월 상한: `cap.interview_monthly` = 3, `cap.visa_monthly` = 3 (포인트 대상 글 수).
- 맛집: 사진 1장 이상 필수, 최소 글자 수, `cap.food_daily` = 2.
- 유사도 검사: 기존 글과의 문장 유사도가 기준 이상이면 claim을 자동 보류.
- Claude 1차 판정: 구조 항목의 타당성, 내용 품질, 복붙 여부를 점수로 기록 (`ai_prescreen`). 기준 미만은 사람 심사로 보냄. AI 판정만으로 자동 거절하지 않는다.
- 허위 확인 또는 신고 누적 시 `clawback` 행으로 회수.
- 계정: 학교 이메일 인증, Gmail 별칭 정규화(점과 +태그 제거), Cloudflare Turnstile.

---

## 4. 사용 규칙

### 4.1 현재 활성

| key | 값 | 비고 |
|---|---|---|
| spend.review_unlock | 10 | 면접·취업, 비자 후기 전체 열람. 맛집은 항상 무료 |
| quota.free_unlocks_lifetime | 5 | 계정당 평생 무료 열람 (Misaeng과 Ellieo 합산) |
| spend.coffee_chat | 120 | hold 후 완료 시 capture |
| spend.housing_post_boost_3d | 15 | 룸메이트·서블렛 글 3일 상단 노출. 에이전트 리스팅에는 적용 안 함 |
| cap.spend_monthly | 기존 월 사용 한도 유지 | 값은 기존 설정 이관 |

### 4.2 비활성 (설정만 만들고 enabled=false)

| key | 값 |
|---|---|
| spend.consult_prep_kit | 30 |
| spend.mentor_qna_3 | 30 |
| spend.resume_review | 60 |
| spend.mock_interview | 150 |
| spend.group_session_deposit | 20 (참석 시 release) |
| spend.event_priority | 10 |
| spend.ai_interview_prep | 5 |

### 4.3 무료 개방 기간

- `paywall.enabled` = false, `paywall.start_date` = 2027-03-01 (확정 시 수정).
- 무료 기간 중 열람은 `content_unlocks.method = 'free_period'` 로 기록하되, 평생 무료 5개 한도에는 포함하지 않는다.
- paywall 시작 2~4주 전 공지 배너와 푸시를 보낸다 (`paywall.notice_days`).
- 무료 기간에도 적립은 정상 진행한다.

### 4.4 커피챗 차감 흐름

1. 신청 시 `point_holds` 에 120 hold (잔액에서 사용 가능 금액만 차감 표시).
2. 완료 확인 시 capture → 원장 `spend` 행 추가.
3. 멘토 취소 시 release (차감 없음).
4. 신청자 무단 불참 시 capture.
5. 신청 화면과 확인 메일에 아래 문구를 반드시 표시하고, 체크박스 동의를 받는다.

> Coffee chats are voluntary conversations with mentors. Misaeng does not guarantee any referral, interview, or employment outcome. Any referral is made solely at the mentor's personal discretion and is subject to the policies of the mentor's employer. Misaeng does not receive any monetary benefit from coffee chats or referrals, and mentors are not compensated by Misaeng.

---

## 5. 인증 서류 업로드와 삭제 시스템

### 5.1 대상

| 인증 종류 | 예시 서류 | 반드시 가리게 할 정보 |
|---|---|---|
| 면접 진행 | 면접 초대 이메일 스크린샷 | 본인 외 이름, 연락처 |
| 합격·취업 | 오퍼레터, 합격 이메일 | 연봉(선택), 주소, 서명 |
| OPT·STEM OPT | EAD 카드, 승인 이메일 | A-number, 카드 번호, 생년월일, 사진 |
| 비자·청원 승인 | I-797 승인 통지, 승인 이메일 | 접수 번호, A-number, 주소 |
| CPT | I-20 해당 페이지 | SEVIS ID, 생년월일, 주소 |

### 5.2 업로드 화면 요구사항 (웹, 앱 공통)

- 허용 형식: jpg, png, heic, pdf. 최대 10MB, 최대 3장.
- 업로드 전 안내 화면을 반드시 거친다 (5.6 문구). 동의 체크박스 없이는 업로드 버튼 비활성.
- 화면 안에서 쓰는 가리기 도구(사각형 블러, 검정 박스)를 제공한다. 가린 결과만 서버로 전송한다.
- 앱: 카메라 촬영과 사진 라이브러리 선택 모두 지원. 업로드 후 앱 내 임시 파일은 즉시 삭제.
- 이메일, DM, 그룹챗으로는 인증 서류를 받지 않는다. 안내 문구에 명시한다.
- 업로드 시 EXIF 메타데이터(위치 정보 포함)를 서버에서 제거한다.

### 5.3 저장

```sql
create type verification_status as enum ('pending', 'approved', 'rejected', 'expired');

create table verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  post_id uuid,
  kind text not null,               -- 'interview', 'offer', 'opt', 'visa_approval', 'cpt'
  status verification_status not null default 'pending',
  uploaded_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  reject_reason text,
  delete_due_at timestamptz not null,   -- 아래 5.4 규칙으로 계산
  deleted_at timestamptz,
  consent_log_id uuid not null          -- 기존 consent logs 연결
);

create table verification_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references verification_submissions(id),
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  sha256 text not null,             -- 삭제 검증용. 파일 내용 자체는 DB에 저장하지 않음
  deleted_at timestamptz
);

create table verification_deletion_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  file_id uuid not null,
  deleted_at timestamptz not null default now(),
  method text not null,             -- 'auto_after_decision', 'auto_expired', 'user_request', 'admin'
  storage_confirmed boolean not null  -- 삭제 후 객체 조회 404 확인 여부
);
```

- Supabase Storage 비공개 버킷 `verification-private` 사용. public URL 금지.
- 관리자 열람은 서버에서 발급하는 60초 서명 URL로만. 다운로드 버튼 없음. 화면에 심사자 ID 워터마크 표시.
- 접근 권한: `reviewer` 역할만. 모든 열람은 `verification_access_log` 에 기록 (누가, 언제, 어떤 파일).
- 심사 결과로 남기는 정보는 인증 종류, 회사명 또는 비자 유형, 승인 여부, 심사자, 일시뿐이다. 연봉, 식별번호 등 서류 내용은 어디에도 옮겨 적지 않는다.
- 공개 화면의 배지는 "인증됨" 하나로 통일한다. 비자 서류로 인증했다는 사실이 공개 프로필에 드러나지 않게 한다.

### 5.4 삭제 규칙

| 상황 | 삭제 시점 |
|---|---|
| 승인 또는 거절 결정 | 결정 후 72시간 이내 |
| 미심사 | 업로드 후 7일 경과 시 status=expired 처리 후 즉시 삭제. 사용자에게 재제출 안내 |
| 사용자 철회 요청 | 요청 즉시 |
| 계정 탈퇴 | 탈퇴 처리 시 즉시 |

- 어떤 경우에도 업로드 후 최대 보관 기간은 7일이다 (`verification.max_retention_days` = 7).
- 삭제는 pg_cron(매시간)으로 실행하는 Edge Function이 처리한다.
  1. `delete_due_at <= now()` 이고 `deleted_at is null` 인 파일 조회
  2. Storage 객체 삭제
  3. 같은 경로 조회로 404 확인
  4. `verification_files.deleted_at`, `verification_submissions.deleted_at` 기록
  5. `verification_deletion_log` 기록
  6. 사용자에게 알림 발송 (5.5)
- 삭제 실패는 재시도 3회 후 ERP 알림과 관리자 이메일로 보고한다.
- 백업 확인 필요: Supabase의 Storage 객체가 백업이나 버전 관리로 남는지 확인하고, 남는다면 그 기간을 약관 문구(6.2)에 반영한다. 확인 전까지 약관에는 "백업 시스템에서 최대 N일 내 삭제" 문구를 비워두지 말고 실제 값으로 채운다.

### 5.5 사용자 고지

- 업로드 직후: "서류가 안전하게 접수되었습니다. 확인 후 72시간 이내, 늦어도 업로드 후 7일 이내에 영구 삭제됩니다."
- 삭제 완료 시 푸시와 마이페이지 알림: "제출하신 인증 서류가 {삭제 일시}에 영구 삭제되었습니다. 인증 결과만 보관됩니다."
- 마이페이지 "인증 내역" 화면: 제출일, 상태, 삭제 예정일, 삭제 완료일을 표시한다. 미삭제 파일이 있으면 "지금 삭제" 버튼 제공.

### 5.6 업로드 전 안내 문구

ko
> 인증 서류는 후기 내용 확인과 추가 포인트 지급에만 사용됩니다. 연봉, A-number, SEVIS ID, 접수 번호, 생년월일, 주소 등 민감한 정보는 가린 뒤 올려주세요. 제출된 파일은 확인 후 72시간 이내, 늦어도 업로드 후 7일 이내에 영구 삭제되며, 인증 결과(인증 여부와 회사명 또는 비자 유형)만 보관됩니다. 서류는 이메일이나 메시지로 보내지 마세요.

en
> Verification documents are used only to confirm your review and award bonus points. Please mask sensitive information such as salary, A-number, SEVIS ID, receipt numbers, date of birth, and address before uploading. Files are permanently deleted within 72 hours after review, and no later than 7 days after upload. Only the verification result (verified status and company or visa type) is kept. Please do not send documents by email or message.

### 5.7 ERP 화면

- 인증 심사 큐: 대기 건수, 업로드 경과 시간, 삭제 예정 시각. 5일 경과 건은 강조 표시.
- 삭제 현황 대시보드: 오늘 삭제 건수, 삭제 예정, 삭제 실패, 보관 기간 초과 건(항상 0이어야 함).
- 보관 기간 초과 건이 1건이라도 생기면 즉시 관리자 알림.
- 월간 리포트: 제출 건수, 승인율, 평균 삭제 소요 시간, 열람 로그 요약.

---

## 6. 사용자 고지 문서: 포인트 안내 페이지, 이용약관, 개인정보처리방침

세 문서를 같은 릴리스에서 함께 업데이트한다. 하나만 바뀌면 내용이 서로 어긋난다.

| 문서 | 위치 | 이번 변경 |
|---|---|---|
| 포인트 안내 페이지 | 웹 `/points` (기존 `/credit`), 앱 마이페이지 > 미생 포인트 > 안내 | 6.5 전체 교체 |
| Terms of Use | 웹 Terms, 앱 설정 > 약관 | 6.1 섹션 교체 또는 신설 |
| Privacy Policy | 웹 Privacy, 앱 설정 > 개인정보처리방침 | 6.2, 6.4 섹션 신설 |

- 영어본이 법적 기준이며, 7개 언어 번역본을 함께 제공한다. 안내 페이지는 ko와 en을 직접 작성하고, 나머지 언어는 번역 배치로 처리한 뒤 일본어와 베트남어는 원어민 검수.
- 개정 후 기존 사용자에게 재동의를 받는다. 기존 consent logs 버전 관리를 사용한다. 약관 버전: `tos-2026-11`, 개인정보처리방침 버전: `privacy-2026-11` (출시일에 맞춰 조정).
- 개정 공지: 시행 최소 14일 전 사이트 배너, 앱 푸시, 가입자 이메일로 공지한다. 공지에는 주요 변경 요약(크레딧 명칭 변경, 인증 서류 처리, 계정 인증 정보 처리)을 넣는다.
- 안내 페이지의 수치는 하드코딩하지 않고 `/api/points/config` 값으로 렌더링한다. 약관에는 수치를 쓰지 않고 "안내 페이지에 게시된 기준"을 참조한다. 그래야 수치를 바꿀 때 약관 재동의가 필요 없다.
- 아래 약관과 개인정보처리방침은 초안이다. 출시 전 변호사 검토를 받는다.

### 6.1 Terms of Use: Misaeng Points

> Misaeng Points ("Points") are a non-monetary reward for contributing to the Misaeng and Ellieo communities. Points cannot be purchased, sold, exchanged for cash or any other item of monetary value, refunded, or transferred between accounts. Points have no cash value and are not property of the user.
>
> Points are earned only through eligible contributions described on the Points page. Misaeng may review contributions before awarding Points and may withhold or reverse Points awarded for content that is inaccurate, duplicated, copied, or otherwise in violation of these Terms.
>
> Points may be used only for the features listed on the Points page. Misaeng may change earning amounts, spending amounts, limits, and available features with prior notice on the service. Points balances are shared across Misaeng and Ellieo under a single account.
>
> Account verification. Certain features and Points rewards are available only to accounts verified through a school email, a work email, or the Instagram verification process described on the Points page. Each email address or Instagram account may be linked to only one Misaeng account. Verification rewards are granted once per verification type and are not granted again for re-verification. Misaeng may decline, expire, or revoke a verification badge if the information provided is inaccurate or no longer current, and may reverse related Points if a verification was obtained improperly.
>
> Free access periods. Misaeng may offer some content free of charge for a limited period. When a free period ends, access to that content will require Points or a paid plan, as described on the Points page. Misaeng will announce the end of any free period in advance.
>
> Account closure. You may delete your account at any time from your account settings on the website or in the app. Because Misaeng and Ellieo share one account, deleting your account removes it from both services. Your account is deactivated immediately and permanently deleted after a 14-day grace period, during which you may cancel the deletion by signing in. Points are forfeited when deletion becomes permanent and cannot be restored or transferred to another account. Before deleting your account, you can choose whether your posts and comments are deleted or kept with your name and profile removed. Deleting your account does not cancel a subscription purchased through the App Store; please cancel it in your Apple account settings. Subscriptions purchased on our website are cancelled automatically when you request deletion, and no refund is issued for the remaining period.
>
> Misaeng Points cannot be purchased and can only be earned by contributing to the community. Every piece of content on Misaeng can be unlocked without paying, simply by sharing your own experience.
>
> Mentors and coffee chat participants act voluntarily and are not compensated by Misaeng. Misaeng does not guarantee any referral, interview, or employment outcome, and does not receive any monetary benefit from coffee chats or referrals.
>
> Misaeng does not provide legal, immigration, or tax advice. Content on the service reflects users' personal experiences and public information only.

### 6.2 Privacy Policy: Verification Documents

> Purpose. If you choose to verify a review, you may upload a screenshot or photo of a document such as an interview invitation, offer letter, employment authorization card, or approval notice. We use these files solely to confirm the accuracy of your review and to award bonus Points.
>
> Minimization. We ask you to mask sensitive information before uploading. We remove image metadata, including location data, on upload. We do not copy any information from your documents into our records other than the verification result.
>
> Retention and deletion. Uploaded files are permanently deleted within 72 hours after review and in all cases no later than 7 days after upload. [Backup copies, if any, are deleted within N days.] We retain only the verification result, which consists of whether verification was approved, the company name or visa type, and the date of review. You will be notified when your files are deleted, and you may request immediate deletion at any time from your account page.
>
> Access. Files are stored in encrypted private storage and can be viewed only by authorized reviewers through time-limited access. Every access is logged.
>
> Sensitive information. Documents related to immigration status are treated as sensitive information. Verification is optional, and choosing not to verify does not affect your ability to post or earn base Points.

### 6.3 동의 항목 (후기 작성 시)

- 필수: 이용약관, 개인정보처리방침
- 선택(각각 별도 체크): ellieo.com 번역 게시, AI 답변 근거 활용, 구독 콘텐츠 포함
- 인증 업로드 시 별도 필수: 인증 서류 처리 동의 (5.6 문구)

### 6.4 Privacy Policy: Account Verification

> What we collect. When you verify your account, we collect the school or work email address you provide, or the Instagram username you use to send us a verification code by direct message. For email verification, we also record the email domain to display your school or company affiliation if you choose to show it.
>
> How we use it. We use this information only to confirm that you are a real student or professional, to prevent duplicate or fraudulent accounts, to display a verification badge, and to award verification Points. We do not send marketing messages to your school or work email unless you separately opt in.
>
> Instagram verification. Instagram verification is reviewed manually by our team. Please send only your Misaeng username and the verification code by direct message. Do not send documents, photos of documents, or other personal information by direct message. If you do, we will delete them and ask you to use the in-app upload instead. Messages sent through Instagram are also subject to Meta's own privacy policy.
>
> Retention. We keep verification information while your account is active. School verification is re-confirmed every year. When your account is permanently deleted, we delete your verification email address and Instagram username, and keep only a one-way keyed hash for 12 months. This value cannot be used to identify you or to contact you. We use it only to prevent the same email address or Instagram account from repeatedly receiving welcome rewards and free review views through new accounts. After 12 months, it is deleted.

### 6.6 Privacy Policy: Account Deletion and Data Retention

> You can delete your account at any time from Settings on the website or in the app. Your account is deactivated immediately, and your data is permanently deleted after a 14-day grace period unless you cancel the deletion by signing in. Verification documents you uploaded are deleted immediately when you request deletion, without waiting for the grace period.
>
> When your account is permanently deleted, we delete your profile, profile photo, saved items, likes, follows, notification settings, device tokens, Points history, and verification information. Depending on the choice you make before deleting, your posts and comments are either deleted, including their translations, or kept with your name, nickname, and profile photo removed so that they are shown as posted by a deleted user.
>
> We keep a limited amount of information after deletion only where needed: a one-way keyed hash of your verification identifiers for 12 months to prevent reward abuse; records of your consent to our Terms and Privacy Policy, separated from your profile, for as long as needed to demonstrate compliance; and payment and transaction records for the period required by tax and accounting laws. Payment card details are held by our payment processor, not by us.
>
> If you signed in with Apple or Google, we also revoke Misaeng's access to that sign-in when your account is deleted.

| 항목 | 탈퇴 요청 시 | 유예 14일 후 | 이후 보관 |
|---|---|---|---|
| 인증 서류 파일 | 즉시 삭제 | | 없음 |
| 프로필, 사진, 좋아요, 팔로우, 알림 설정, 푸시 토큰 | 비공개 처리 | 삭제 | 없음 |
| 게시글, 댓글, 번역본 | 비공개 처리 | 사용자 선택에 따라 삭제 또는 익명화 | 익명화 시 작성자 정보 없이 유지 |
| 포인트 원장, 잔액 | 사용 중지, hold 해제 | 삭제 | 없음 |
| 인증 이메일, 인스타그램 계정명 | 비공개 처리 | HMAC 값으로 대체 | 12개월 후 삭제 |
| 약관·개인정보 동의 기록 | 유지 | 프로필과 분리 | 법적 대응에 필요한 기간 |
| 결제·거래 기록 | 유지 | 유지 | 세법상 보관 기간 (CPA 확인) |

### 6.5 포인트 안내 페이지 문안

화면 구성 (웹 `/points`, 앱 안내 화면 공통)
1. 미생 포인트란
2. 포인트 모으기 (표, config 값 렌더링)
3. 포인트 쓰기 (표, enabled=true 항목만 노출)
4. 계정 인증 방법
5. 인증 서류는 어떻게 처리되나요
6. 꼭 알아두세요 (규칙)
7. 자주 묻는 질문
8. 하단 링크: 이용약관, 개인정보처리방침

아래 문안의 숫자는 2026-10-26 기준 config 초기값이다. 구현 시 `{key}` 자리에 config 값을 넣는다.

#### ko

미생 포인트란
> 미생 포인트는 경험을 나눠주신 분께 드리는 감사의 표시입니다. 포인트는 구매할 수 없고, 커뮤니티에 기여해야만 모을 수 있어요. 돈을 내지 않아도 내 경험을 나누면 미생의 모든 콘텐츠를 열어볼 수 있습니다. 미생 포인트는 Ellieo와 공유됩니다.

포인트 모으기

| 활동 | 포인트 |
|---|---|
| 학교 또는 직장 이메일 첫 인증 (웰컴) | {earn.verify_first_email} |
| 두 번째 이메일 인증 (예: 졸업 후 직장 인증) | {earn.verify_second_email} |
| 인스타그램 인증 | {earn.verify_instagram} |
| 온보딩 퀴즈 완료 | {earn.onboarding_quiz} |
| 프로필 완성 | {earn.profile_complete} |
| 매일 출석 (7일 연속 시 +{earn.checkin_streak7}) | {earn.checkin} |
| 친구 추천 (친구가 이메일 인증 완료 시) | {earn.referral} |
| 면접·취업 후기 | {earn.interview.base} |
| OPT·비자·영주권 후기 | {earn.visa.base} |
| 단계별 상세 작성 | +{earn.interview.detail} |
| 합격·승인 서류 인증 | +{earn.interview.verified} |
| 미생 Pick 선정 | +{earn.interview.pick} |
| 아직 후기가 없는 회사의 첫 후기 | +{earn.first_company_review} |
| 맛집 후기 (사진 필수) | {earn.food.base} |
| 댓글 | {earn.comment} |
| 답변 채택 | {earn.accepted_answer} |

후기 포인트는 운영진 확인 후 지급됩니다. 보통 며칠 안에 처리되며, 지급되면 알림을 보내드려요.

포인트 쓰기

| 사용처 | 포인트 |
|---|---|
| 면접·취업, 비자 후기 전체 보기 (평생 {quota.free_unlocks_lifetime}개 무료) | {spend.review_unlock} |
| 1:1 커피챗 30분 | {spend.coffee_chat} |
| 룸메이트·서블렛 글 3일 상단 노출 | {spend.housing_post_boost_3d} |

맛집 후기는 언제나 무료입니다. 한 번 열어본 후기는 다시 포인트가 차감되지 않아요. 무료 개방 기간({paywall.start_date} 전까지)에는 모든 후기를 포인트 없이 볼 수 있습니다.

계정 인증 방법
> 학교 이메일: 마이페이지에서 학교 이메일을 입력하고, 받은 인증 코드를 입력하세요.
> 직장 이메일: 회사 도메인 이메일만 인증할 수 있어요. 개인 메일(gmail 등)은 인증되지 않습니다.
> 인스타그램: 마이페이지에서 인증 코드를 받은 뒤, 미생 공식 인스타그램 계정에 DM으로 미생 아이디와 코드를 보내주세요. 운영진이 확인 후 승인합니다. DM으로는 서류나 사진을 보내지 마세요.
> 하나의 이메일과 인스타그램 계정은 하나의 미생 계정에만 연결할 수 있어요. 인증 포인트는 종류별로 한 번만 지급됩니다.

인증 서류는 어떻게 처리되나요
> 합격·승인 서류는 후기 확인과 추가 포인트 지급에만 사용됩니다. 연봉, A-number, SEVIS ID, 접수 번호, 생년월일, 주소는 가리고 올려주세요. 업로드 화면의 가리기 도구를 쓰면 편해요. 제출된 파일은 확인 후 72시간 이내, 늦어도 업로드 후 7일 이내에 영구 삭제되고, 삭제되면 알림을 보내드립니다. 보관되는 것은 인증 결과뿐이에요. 마이페이지 > 인증 내역에서 삭제 상태를 직접 확인하고, 언제든 바로 삭제할 수 있습니다.

꼭 알아두세요
> 포인트는 현금 가치가 없으며 판매, 환불, 환전, 양도할 수 없어요.
> 같은 회사, 직무, 지원 시기의 후기는 한 번만 포인트가 지급됩니다.
> 포인트가 지급되는 면접·취업 후기와 비자 후기는 각각 한 달에 {cap.interview_monthly}개까지예요.
> 사실과 다르거나 다른 글을 베낀 후기는 포인트가 회수될 수 있어요.
> 커피챗 멘토는 자원봉사로 참여하며 미생에서 어떤 보상도 받지 않습니다. 레퍼럴은 멘토의 개인 판단이고 보장되지 않으며, 미생은 커피챗과 레퍼럴로 어떤 금전적 이익도 얻지 않습니다.
> 미생은 법률, 이민, 세무 자문을 제공하지 않습니다.
> 포인트 기준은 바뀔 수 있으며, 바뀌기 전에 미리 알려드려요.

자주 묻는 질문
> Q. 포인트를 돈으로 살 수 있나요? A. 아니요. 미생 포인트는 기여로만 모을 수 있어요. 바로 모든 후기를 보고 싶다면 구독을 이용하실 수 있지만, 구독으로 포인트가 생기지는 않습니다.
> Q. 포인트에 유효 기간이 있나요? A. 활동으로 모은 포인트는 사라지지 않아요. 탈퇴하면 포인트도 함께 사라집니다.
> Q. Ellieo에서도 쓸 수 있나요? A. 네. 같은 계정이면 잔액이 공유됩니다.
> Q. 인스타그램만 인증해도 되나요? A. 기본 인증으로 출석, 댓글, 맛집 후기 포인트를 모을 수 있어요. 면접·취업, 비자 후기 포인트와 커피챗은 학교 또는 직장 이메일 인증 후 이용할 수 있습니다.

#### en

What are Misaeng Points
> Misaeng Points are our way of thanking you for sharing your experience. Points cannot be purchased and can only be earned by contributing to the community. You can unlock every piece of content on Misaeng without paying, simply by sharing your own experience. Your points are shared between Misaeng and Ellieo.

Earning points: same table as ko, labels in English.
- First school or work email verification (welcome bonus)
- Second email verification (for example, a work email after graduation)
- Instagram verification
- Onboarding quiz
- Complete your profile
- Daily check-in (+{earn.checkin_streak7} for a 7-day streak)
- Refer a friend (after your friend verifies an email)
- Interview and job review
- OPT, visa, and green card review
- Detailed step-by-step review
- Verified with an offer or approval document
- Selected as a Misaeng Pick
- First review for a company with no reviews yet
- Restaurant review (photo required)
- Comment
- Accepted answer

> Review points are awarded after our team reviews your post, usually within a few days. We will notify you when they are added.

Using points
- View a full interview, job, or visa review ({quota.free_unlocks_lifetime} free for life)
- 30-minute 1:1 coffee chat
- Pin a roommate or sublet post for 3 days

> Restaurant reviews are always free. You are never charged twice for a review you have already opened. During the free access period (until {paywall.start_date}), all reviews can be viewed without points.

Verifying your account
> School email: Enter your school email on your account page and type in the code we send you.
> Work email: Only company domain emails can be verified. Personal email addresses such as Gmail cannot be used.
> Instagram: Get a code from your account page, then send your Misaeng username and the code by direct message to Misaeng's official Instagram account. Our team will review and approve it. Please do not send documents or photos by direct message.
> Each email address and Instagram account can be linked to only one Misaeng account. Verification points are awarded once per verification type.

How we handle verification documents
> Documents are used only to confirm your review and award bonus points. Please mask salary, A-number, SEVIS ID, receipt numbers, date of birth, and address before uploading. The masking tool on the upload screen makes this easy. Files are permanently deleted within 72 hours after review, and no later than 7 days after upload. We will notify you when they are deleted. We keep only the verification result. You can check the deletion status and delete files immediately at any time from Account > Verification History.

Good to know
> Points have no cash value and cannot be sold, refunded, exchanged, or transferred.
> Points are awarded once per company, role, and application cycle.
> Up to {cap.interview_monthly} interview and job reviews and {cap.visa_monthly} visa reviews earn points each month.
> Points may be reversed for reviews that are inaccurate or copied from other content.
> Coffee chat mentors volunteer their time and are not compensated by Misaeng. Any referral is at the mentor's personal discretion and is not guaranteed. Misaeng does not receive any monetary benefit from coffee chats or referrals.
> Misaeng does not provide legal, immigration, or tax advice.
> Point rules may change, and we will let you know in advance.

FAQ
> Can I buy points? No. Misaeng Points can only be earned by contributing. If you want to see every review right away, you can subscribe, but subscriptions do not add points.
> Do points expire? Points you earn do not expire. Points are removed when you close your account.
> Can I use my points on Ellieo? Yes. Your balance is shared when you use the same account.
> Is Instagram verification enough? Instagram gives you basic verification, which lets you earn points for check-ins, comments, and restaurant reviews. Interview, job, and visa review points and coffee chats require a school or work email verification.

#### 화면 구현 규칙
- 표의 행은 config에서 enabled=true인 항목만 렌더링한다. 비활성 사용처(멘토 Q&A 등)는 노출하지 않는다.
- 웹과 앱이 같은 문안 키를 쓴다 (공용 문구 파일). 앱은 별도 문구를 두지 않는다.
- 페이지 하단에 "최종 업데이트: {날짜}"를 표시한다. 수치가 바뀌면 자동 갱신.
- 기존 `/credit` 페이지의 "이민 변호사 자문" 문구는 완전히 삭제한다.

---

## 7. API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /api/points/config | 활성 규칙과 표시 이름 |
| GET | /api/points/balance | 잔액, 사용 가능 금액(hold 제외), 이번 달 사용량 |
| GET | /api/points/history | 원장 내역 (페이지네이션) |
| POST | /api/points/checkin | 출석 |
| POST | /api/posts/{id}/unlock | 열람. 무료 기간, 무료 한도, 구독, 포인트 순서로 판단 |
| POST | /api/verifications | 인증 업로드 (multipart) |
| GET | /api/verifications | 내 인증 내역과 삭제 상태 |
| DELETE | /api/verifications/{id} | 즉시 삭제 요청 |
| POST | /api/admin/claims/{id}/decision | ERP 심사 결정 |
| POST | /api/admin/verifications/{id}/decision | ERP 인증 결정 (delete_due_at 갱신) |
| POST | /api/account/verifications/instagram/code | 인스타그램 인증 코드 발급 |
| POST | /api/account/school-domain-requests | 학교 추가 요청 |
| POST | /api/account/deletion | 탈퇴 요청 (재인증 토큰, content_choice, reason) |
| DELETE | /api/account/deletion | 유예 기간 중 탈퇴 취소 |
| GET | /api/account/deletion | 탈퇴 예정 상태 조회 |
| GET/POST/PATCH | /api/admin/school-domains | ERP 학교 도메인 조회, 추가, 수정, 비활성화 |
| POST | /api/admin/school-domains/import | CSV 일괄 가져오기 (미리보기 후 확정) |
| POST | /api/admin/school-domains/test | 이메일 매칭 테스트 |

- 오류 응답은 사용자용 ko, en 문구로 변환해서 보낸다 (기존 오류 문구 개선 작업과 같은 규칙).
- 앱은 모든 수치를 config API에서 받는다. 앱 내 상수 금지.

---

## 8. 구현 순서 (Claude Code 작업 단위)

1. 이름 변경: i18n 키, 공용 문구 파일, `/credit` → `/points` 리다이렉트, "이민 변호사 자문" 사용처 제거
2. DB 마이그레이션: 2장 테이블, RLS, `spend_points()` RPC. 기존 크레딧 데이터 이관 스크립트
3. config API와 ERP 규칙 편집 화면
4. 적립: point_claims 생성 로직, 파밍 방지 검사, ERP 심사 큐, 승인 시 원장 기록과 푸시
5. 인증 업로드: 비공개 버킷, 가리기 도구, EXIF 제거, 서명 URL 열람, 열람 로그
6. 삭제 시스템: pg_cron + Edge Function, 삭제 확인, 사용자 알림, ERP 대시보드와 초과 알림
7. 사용: 열람 잠금(무료 기간 플래그 포함), 커피챗 hold/capture, 서블렛 상단 노출
8. 출석, 온보딩 퀴즈, 추천 보상
9. 계정 인증 포인트: account_verifications 테이블, 기존 인증 데이터 이관, 인스타그램 코드 발급과 ERP 승인 큐, 학교 인증 1년 재확인
9-1. 학교 도메인 관리: verification_school_domains 테이블, school_domains_seed.csv 시드 적재, ERP 관리 화면(3.1.2), 차단 도메인 목록, 학교 추가 요청 큐
9-2. 회원 탈퇴: 10장 전체. iOS App Store 제출 전 필수
10. 기존 인증 사용자 소급 지급: 이미 학교·직장·인스타그램 인증을 받은 사용자에게 3.1 기준으로 1회 지급 (idempotency_key 동일 규칙). 지급 전 대상자 수와 총 포인트를 ERP에서 확인 후 실행
11. 고지 문서 3종 동시 업데이트: 포인트 안내 페이지(6.5), 이용약관(6.1), 개인정보처리방침(6.2, 6.4), 재동의 흐름과 14일 사전 공지
12. 앱(SwiftUI): 잔액, 내역, 출석, 인증 업로드(카메라 포함), 인증 내역 화면, 인스타그램 인증 코드 화면, 포인트 안내 화면

staging DB가 없으면 2번 전에 staging 환경을 먼저 만든다. 원장과 삭제 로직은 운영 DB에서 처음 테스트하지 않는다.

---

## 9. 수용 테스트 (최소)

- 같은 글 열람을 두 번 요청해도 차감은 1회.
- 동시에 두 번 차감 요청해도 잔액이 음수가 되지 않음.
- 같은 회사·직무·시기로 두 번째 후기를 쓰면 포인트 claim이 생성되지 않음.
- 월 상한 초과 후기는 게시되지만 claim 없음.
- 인증 승인 후 72시간 내 파일 삭제, Storage 조회 404, 삭제 로그 생성, 사용자 알림 발송.
- 미심사 7일 경과 시 expired 처리와 삭제.
- 사용자 즉시 삭제 요청 후 서명 URL 재발급 불가.
- 관리자 열람마다 access log 생성.
- 무료 기간 중 열람은 무료 5개 한도를 소모하지 않음.
- 커피챗 멘토 취소 시 hold release, 원장 spend 없음.
- 결제 경로 어디에서도 포인트가 적립되지 않음.
- 학교 이메일, 직장 이메일, 인스타그램을 모두 인증해도 인증 포인트 합계가 45를 넘지 않음 (인증 순서와 무관).
- 인스타그램 먼저 인증 후 이메일 인증 시 웰컴 잔여분 20만 지급.
- 같은 이메일이나 인스타그램 계정명으로 두 번째 계정 인증 시 거부.
- 개인 메일 도메인으로 직장 인증 시 거부.
- 학교 인증 만료 후 재인증 시 포인트 미지급.
- 인스타그램만 인증한 계정은 면접·취업 후기 claim이 생성되지 않음.
- 안내 페이지의 모든 수치가 config 값과 일치하고, 비활성 사용처는 노출되지 않음.
- 약관 재동의 전 사용자는 다음 로그인 시 재동의 화면을 거침.
- `login.cuny.edu`, `g.harvard.edu` 가 상위 도메인 행으로 매칭되고, `tc.columbia.edu` 는 Teachers College로 표시됨.
- ERP에서 도메인을 비활성화하면 신규 인증은 거부되고 기존 인증은 유지됨.
- 도메인 추가와 수정이 history에 기록되고, 서버 캐시가 즉시 갱신됨.
- 인스타그램 인증은 코드 일치와 1계정 1연결만 확인하고, 계정 품질 기준으로 거부하지 않음.
- 탈퇴 요청 즉시 인증 서류 파일 삭제, 커피챗 취소, hold 해제, 웹 구독 갱신 해지.
- 유예 기간 중 로그인 후 삭제 취소 시 계정과 게시글이 복구됨.
- 14일 후 영구 삭제 시 선택에 따라 게시글이 삭제 또는 "탈퇴한 사용자"로 익명화됨.
- 영구 삭제 후 같은 이메일로 재가입하면 웰컴·인증 포인트와 무료 열람 5개가 지급되지 않음 (12개월 내).
- 12개월이 지난 해시값은 자동 삭제됨.
- Apple 로그인 사용자 탈퇴 시 Apple 토큰 해지 API가 호출됨.

---

## 10. 회원 탈퇴 (신규)

현재 가입과 로그인만 있고 탈퇴 기능이 없다. App Store는 앱에서 계정을 만들 수 있으면 앱 안에서 계정 삭제를 시작할 수 있어야 한다는 심사 기준이 있으므로, iOS 앱 출시 전 필수 작업이다. Google Play도 같은 요구가 있어 Android 개발 시 그대로 적용한다.

### 10.1 진입 위치
- 웹: 마이페이지 > 설정 > 회원 탈퇴
- 앱: 마이페이지 > 설정 > 계정 삭제
- 두 단계 이상 깊이 숨기지 않는다. 설정 화면에서 바로 보이게 한다.

### 10.2 탈퇴 흐름

1. 안내 화면
   - 미생과 Ellieo 계정이 함께 삭제된다는 안내
   - 현재 포인트 잔액과 "탈퇴가 확정되면 포인트는 복구되지 않습니다" 문구
   - 진행 중인 커피챗, 심사 대기 중인 후기 포인트, 제출된 인증 서류 현황
   - 구독 상태
     - 웹 결제 구독: "탈퇴 요청 시 자동 갱신이 해지되며 남은 기간은 환불되지 않습니다"
     - App Store 구독: "App Store 구독은 미생에서 해지할 수 없습니다. 탈퇴 전 Apple 계정 설정에서 해지해주세요" 와 설정으로 이동하는 링크
2. 게시글 처리 선택 (필수 선택, 기본값 없음)
   - 익명으로 남기기: 작성자 이름, 닉네임, 프로필 사진을 지우고 "탈퇴한 사용자"로 표시
   - 모두 삭제: 게시글, 댓글, 번역본을 모두 삭제
   - 안내 문구: "다른 사용자에게 도움이 되는 후기를 익명으로 남겨주시면 감사하겠습니다. 어느 쪽을 선택하셔도 개인 정보는 모두 삭제됩니다."
3. 탈퇴 사유 (선택 입력)
4. 본인 재확인
   - 이메일 가입자: 비밀번호 재입력
   - Apple, Google 로그인: 해당 서비스로 다시 로그인 (최근 5분 이내 인증)
5. 최종 확인 버튼: "계정 삭제 요청"
6. 완료 화면과 확인 이메일: 삭제 예정일과 취소 방법 안내

### 10.3 유예 기간 (14일)

- 요청 즉시: 계정 비활성화. 프로필과 게시글이 다른 사용자에게 보이지 않음. 인증 서류 파일 즉시 삭제. 진행 중인 커피챗 취소와 멘토 알림, point_holds 해제, 심사 대기 claim 취소. 웹 구독 자동 갱신 해지. 푸시 발송 중지.
- 유예 중 로그인하면 "계정 삭제 예정" 화면만 보이고 "삭제 취소" 버튼을 제공한다. 취소하면 모든 상태가 복구된다 (취소된 커피챗과 claim은 복구하지 않고 다시 신청 안내).
- 유예 기간은 `account.deletion_grace_days` = 14 로 설정에서 관리한다.

### 10.4 영구 삭제 작업

pg_cron(매일)으로 실행하는 Edge Function이 유예가 끝난 요청을 처리한다.

1. 게시글과 댓글: 사용자 선택에 따라 삭제(번역본 포함) 또는 익명화 (`author_id` null, 표시명 "탈퇴한 사용자", 프로필 사진 연결 제거)
2. 프로필, 프로필 사진(Storage), 좋아요, 팔로우, 저장, 알림 설정, 푸시 토큰, 추천 코드 삭제
3. 포인트 원장과 content_unlocks, daily_checkins, point_holds 삭제
4. account_verifications: 식별자를 HMAC-SHA256 값으로 바꿔 `deleted_identity_hashes` 로 옮기고 원본 행 삭제
5. consent logs: 프로필과 연결을 끊고 가명 ID로 보관
6. 결제 기록: 거래 ID, 금액, 일시만 남기고 이름, 이메일은 삭제 (보관 기간은 CPA 확인)
7. Apple 로그인 사용자: Apple 토큰 해지 API 호출. Google 로그인 사용자: Google 토큰 해지
8. Supabase auth 사용자 삭제
9. `account_deletion_log` 기록 (요청일, 확정일, 게시글 처리 방식, 각 단계 성공 여부. 개인정보 없음)
10. 실패 단계가 있으면 재시도 3회 후 ERP 알림

```sql
create table account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,        -- requested_at + grace days
  content_choice text not null,              -- 'anonymize', 'delete'
  reason text,
  status text not null default 'scheduled',  -- scheduled, cancelled, completed, failed
  cancelled_at timestamptz,
  completed_at timestamptz
);

create table deleted_identity_hashes (
  hash text primary key,                     -- HMAC-SHA256(server_secret, kind || ':' || normalized_identifier)
  kind text not null,                        -- school_email, work_email, instagram, signup_email
  created_at timestamptz not null default now(),
  expires_at timestamptz not null            -- created_at + 12 months
);

create table account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  step text not null,
  success boolean not null,
  detail text,
  logged_at timestamptz not null default now()
);
```

### 10.5 재가입 처리

- 영구 삭제 후 같은 이메일로 재가입할 수 있다.
- 가입 이메일과 인증 식별자는 정규화 후 HMAC 값으로 `deleted_identity_hashes` 와 대조한다. 일치하면 12개월 동안 다음을 다시 주지 않는다.
  - 웰컴 포인트와 모든 인증 포인트
  - 평생 무료 열람 5개
  - 온보딩 퀴즈, 프로필 완성 포인트
- 계정 이용 자체는 막지 않는다. 일반 활동 포인트(후기, 댓글, 출석)는 정상 적립된다.
- `expires_at` 이 지난 해시값은 매일 삭제한다.

보관 기간을 12개월로 정한 이유
- 막으려는 이익은 최대 인증 포인트 45와 무료 열람 5개다. 이익이 작아서 오래 보관할 이유가 약하다.
- 12개월이면 한 학년과 한 번의 채용 시즌을 덮는다. 탈퇴와 재가입을 반복해 혜택을 받는 패턴은 대부분 이 기간 안에 일어난다.
- 개인정보 최소 보관 원칙상 이보다 길게 잡으면 근거를 설명하기 어렵다.

### 10.6 ERP 화면
- 탈퇴 현황: 유예 중, 취소, 완료, 실패 건수
- 실패 건 상세와 수동 재처리 버튼
- 월간 탈퇴 사유 집계 (선택 입력분)
- 개인정보는 표시하지 않는다. 유예 중 요청만 사용자 ID로 조회 가능

---

## 11. 미정 사항

- ellieo.com 표시 이름 (Ellieo Points 유지 여부)
- 웰컴 포인트 사용 기한
- 유료 전환 확정일 (현재 2027-03-01 가정)
- 기존 월 사용 한도 값
- Supabase Storage 백업 보관 기간 (약관 반영 필요)
- 결제 기록 보관 기간 (CPA 확인)
- 학교 도메인 시드 데이터 검수 (도메인 정확성, 한글 학교명)
- 약관과 개인정보처리방침 변호사 검토

---

## 수정 이력

- 2026-10-26 v1: 최초 작성
- 2026-10-26 v2: 계정 인증 포인트(3.1, 3.1.1, 2.6) 추가, 고지 문서 3종 업데이트 범위와 포인트 안내 페이지 문안(6장) 추가, 약관과 개인정보처리방침에 계정 인증 조항 추가, 기존 인증 사용자 소급 지급 작업 추가
- 2026-10-26 v3: 회원 탈퇴 기능(10장) 신설, 탈퇴 후 HMAC 해시 12개월 보관 확정, 인스타그램 품질 기준 삭제, 학교 도메인 ERP 관리(3.1.2)와 뉴욕·보스턴 시드 목록(school_domains_seed.csv) 추가, 약관과 개인정보처리방침에 탈퇴·보관 조항(6.6) 추가
