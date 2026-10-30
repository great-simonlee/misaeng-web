# Ellieo 베트남 피벗: 진행 상태

마지막 갱신: 2026-10-30 (체크포인트 1 완료, 승인 대기)
작업 위치: ~/Simon/ellieo-website (misaeng-web 워크트리, 브랜치 `ellieo/vietnam-pivot`, 기준 커밋 `ff791c4`)
코드 변경: 없음. docs/ 아래 문서만 작성. 커밋·push 안 함.

---

## ⏸ 재개 메모 (2026-10-30 오후, 사용자 외출로 일시 중지)

- 마지막 커밋: `540c040` (로컬 WIP, push 안 함). 작업 트리 깨끗함. `npx tsc --noEmit` 통과.
- 사용자 결정 (DECISIONS.md에 아직 미기록 → 재개 시 기록): ① 언어 = **en 기본(접두사 없음) + vi(`/vi`)**, 다른 언어 없음 (브리프의 vi 기본을 뒤집음) ② **미생과 완전히 다른 새 디자인**.
- 완료: ja·zh-CN·zh-TW·id 문구/약관 번역/CJK 글꼴 삭제, Ellieo 언어 설정·proxy·언어 메뉴(EN/VI), 새 테마 `src/app/ellieo-theme.css` + Be Vietnam Pro(`src/lib/fonts/ellieo.ts`), Ellieo 전용 `src/screens/ellieo/EllieoHomeScreen.tsx`, `src/widgets/ellieo/*`(Navbar, Footer, HousingCard, AuthNote, VsaPartnersSection 기본 숨김, 하단 탭 nav), 한인 학생회·인플루언서 영역 Ellieo에서 숨김.
- 1차 스크린샷: `~/Simon/devlog/ellieo/shots-2026-10-30/` (home·vihome·housing·vihousing·board·post·login, m=390 / d=1440), 이전 화면은 `before/`.
- 10-30 저녁 재개: 회사 목록·회사 상세·채용 공고 히어로를 Ellieo 스타일로(평평한 남색, 글로우·격자 제거, 추천 회사 파란 테두리, A–Z 글자 단색, 강조 숫자 노란색). 공용 컴포넌트에는 `data-ui` 속성만 추가하고 스타일은 `ellieo-theme.css`에만 둠(미생 화면 영향 없음). 390px 가로 넘침 없음 확인(/nyc, companies, postings, me, housing, partners, /vi/nyc), 날짜는 `7 Nov`처럼 일·월 순서 확인.
- 10-30 저녁: 홈을 콘텐츠 우선으로 재구성(사용자 요청). 큰 남색 히어로·"Start here" 제거 → 짧은 소개+게시판 바로가기 → 파트너 학생회(VSA) → 인플루언서 → 새 매물(실데이터 4개) → 커뮤니티 글 → 안전 안내(축약) → 매거진. 학생회·인플루언서·커뮤니티 글은 **목데이터**(`src/widgets/ellieo/mockContent.ts`), `.env.local`의 `NEXT_PUBLIC_ELLIEO_MOCK_CONTENT=1`일 때만 보이고 "Sample data" 표시. 운영 빌드에는 안 나감. 실제 파트너가 생기면 같은 파일의 실데이터 배열을 채우면 됨.
- 남은 일: ① 미생 화면 변화 없음 확인 마무리(중단 직전 "페이지 높이가 운영과 일치" 확인 중) ② 베트남어 화면 점검(문구 원어민 검수 필요 표시) ③ 나머지 화면(글 상세 세부, 마이페이지, 회사/후기 등) 새 디자인 적용 ④ 390px 가로 넘침 재확인 ⑤ 날짜 일/월/년 표기 확인 ⑥ DECISIONS.md·STATUS.md 정리 후 정식 커밋 ⑦ ERP 후속(STATUS에 기록만): POSTING_LOCALES·번역 배치 대상, consent_logs `ui_language` 제약.
- 재개 방법: `cd ~/Simon/ellieo-website && npx next dev --port 3100` → http://localhost:3100/nyc. 미생 비교가 필요하면 `NEXT_PUBLIC_BRAND=misaeng NEXT_DIST_DIR=.next-misaeng npx next dev --port 3101` 후 끝나면 서버 종료·`.next-misaeng` 삭제 (디스크 부족 주의: 시작 전 `df -h /`).

## 완료

- 체크포인트 0
  - 1부 브리프 저장: docs/specs/ellieo_vietnam_pivot_brief.md
  - docs/DECISIONS.md, docs/STATUS.md 생성
- 체크포인트 1: 현재 상태 조사 → docs/specs/ellieo_vietnam_restructure.md 1장
  - 코드 읽기: misaeng-web(이 워크트리), ellieo-erp, misaeng-app, ellieo-web
  - 운영 Supabase 읽기 전용 조회(행 수·분포만), 공개 URL 응답 확인

## 진행 중

- 없음. 체크포인트 2(구조 설계 문서 2~8장)는 승인 후 시작.

## 결정 필요 (설계 문서 3장에서 다룰 항목)

- 브리프 9장 검토 항목 7개 전부 (첫 출시 범위, 출시일, 검증 숫자, 뉴욕 외 학교, 번역 후기 선별, 섭외 일정, 공식 원칙·사기 가이드)
- 계정 공유안 vs 브랜드별 계정 분리 (현재 코드는 공유 전제)
- 포인트 원장 브랜드 분리 vs 공유 (현재 brand 필드 없음)
- 커뮤니티 브랜드 분리 방식 (게시글 JSON에 brand 필드 vs 별도 저장 위치)
- Storage JSON 저장 구조를 유지할지, 게시글·매물·학교 목록을 Postgres 테이블로 옮길지 (성조 무시 검색, 리드 기록, 지역 설정에 영향)
- staging 구축 방식 (Supabase 프로젝트 추가 등)

## 사양과 다른 구현 (현재 코드 vs 사양)

| 항목 | 사양 | 현재 구현 |
|---|---|---|
| Ellieo 언어 | 브리프: vi 기본 + en | en 기본 + ko, vi, ja, zh-CN, zh-TW, id (10-23 합의안대로 구현) |
| 학교 도메인 | points spec: `verification_school_domains` 테이블, region | 코드 내장 13개 + ERP Storage JSON. 테이블·지역·브랜드 없음. 뉴욕주 학교 포함 |
| 직장 인증 | 브리프: 자동 거절·MX·WHOIS·회사 목록 자동 승인·수동 심사 / points spec: 자동 | 개인 메일 차단 + 전부 ERP 수동 심사 |
| 인증 재확인 | 1년마다 재확인 | 없음 |
| 후기 선택 동의 | points spec 6.3: 번역 게시, 구독 콘텐츠 포함 | 없음 |
| 동의 기록 | `consent_logs` 테이블 | Storage JSON (테이블은 운영 DB에 미적용) |
| 신고 처리 약속 | 브리프: config 48/72시간, 사기·개인정보 유형 | 약관 하드코딩 24시간, 자동 숨김 3명 하드코딩, SLA config 없음 |
| 하우징 문의 | 리드 출처 기록 | mailto 링크만, 기록 없음 |
| 신뢰 표시 | 운영사·라이선스·브로커리지 | 없음 |
| 포인트 | 등급, 신고 보상 | 없음 |
| 분석 | brand·locale·platform 이벤트 | 비용 카운터만 |
| staging | 운영 DB에서 처음 테스트하지 않음 | staging 없음, SQL은 운영에 바로 실행돼 왔음 |

## 채팅에서 결정 필요

1. **ellieo.com 도메인 전환과 옛 앱 API**: 옛 Ellieo 앱 API가 `ellieo.com/v1/api`에 있다. 새 웹을 ellieo.com에 올릴 때 `/v1/api`를 기존 서버로 계속 보낼지(리버스 프록시), API를 `api.ellieo.com` 등으로 옮길지. 옛 앱과 Misaeng 예전 로그인(`ELLIEO_LEGACY_LOGIN`)이 이 API를 쓴다.
2. **Ellieo 웹 호스팅**: misaeng.com처럼 AWS 서버에 올릴지, Vercel에 Ellieo 프로젝트를 새로 만들지 (현재 `VERCEL_PROJECT_ID_ELLIEO` 없음).
3. **운영 브랜치 정리**: 현재 `feat/multilingual` → `release/v0.0.24`로 배포, `main`/`develop`은 정지 상태. Ellieo 작업 브랜치를 어디로 합칠지, 다른 세션의 미커밋 작업(DC 도시 등)과의 순서.
4. **staging**: 별도 Supabase 프로젝트를 만들지 (비용 발생 가능). 지금은 운영 DB 하나뿐.
5. **옛 Ellieo 앱 데이터 조회**: 사용자 수·가입 언어·렌트/룸메이트 수를 Ellieo 백엔드 담당자에게 요청할지, AppConnect 관리자 API로 직접 조회해도 되는지.
6. **Misaeng 후기 동의 소급**: 두 동의를 받은 후기가 0개다. 기존 작성자(후기 7개)에게 동의를 다시 요청할지, 출시 초기 번역 후기 없이 갈지.
7. **기존 vi·ja·zh·id 번역 문구 처리**: vi 문구는 이미 있다. 원어민 검수 전까지 그대로 쓸지. 다른 언어 삭제 시 Misaeng 쪽(브랜드 무관 공용 문구·법무 번역)에 영향이 없는지 함께 확인할지.
8. **Ellieo 이메일 발신자**: Ellieo 인증 메일을 `no-reply@ellieo.com`으로 보낼지 (Resend 도메인 추가 필요).
9. **보안 정리 시점**: GitHub Variables `APP_ENV_JSON`에 들어 있는 Supabase service role key를 Secret으로 옮기고 교체할지 (Ellieo 배포 설정 전에).
10. 누락 사양 파일 `translation_feature_spec.md`, `immigration_info_spec.md` 제공 여부.
