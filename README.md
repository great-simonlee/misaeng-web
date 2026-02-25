# misaeng_temp_web

Next.js 기반 웹 프로젝트입니다.

- **버전**: 0.0.1 beta
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

## 배포

Next.js 앱은 [Vercel](https://vercel.com) 에서 쉽게 배포할 수 있습니다.  
[배포 가이드](https://nextjs.org/docs/app/building-your-application/deploying) 를 참고하세요.
