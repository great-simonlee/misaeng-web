# Firebase setup for NYC Community

## 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use an existing one)
3. Add a **Web** app and copy the config into `.env.local` (see `.env.example`)

## 2. Enable Authentication

Authentication → Sign-in method:

- Email/Password → Enable
- Google → Enable
- **Phone** → Enable (휴대폰 인증용, Blaze 플랜·SMS 할당량 필요)

Authorized domains should include `localhost` and `misaeng.com`.

### 학교 이메일 인증 (EmailJS)

1. EmailJS에 템플릿을 만들고 **To Email**을 `{{to_email}}`로 설정
2. 본문에 `{{otp_code}}` 또는 `{{message}}` 포함
3. `.env.local`에 `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_SCHOOL_OTP` 추가

미설정 시 confirmation 템플릿으로 폴백하지만, To가 고정이면 학교 메일로 전송되지 않습니다.

### 비용 가드 (중요)

SMS는 회사 비용에 직접 영향을 줍니다. 앱에서는 아래를 기본 적용합니다.

| 가드 | 기본값 |
|------|--------|
| `NEXT_PUBLIC_ENABLE_PHONE_SMS` | `false` (명시 ON 전까지 SMS 차단) |
| `NEXT_PUBLIC_PHONE_TEST_ONLY` | 개발 환경에서는 항상 테스트 번호만 |
| 학교 인증 선행 | 없음 (학교/휴대폰 독립) |
| 일일 한도 | SMS 2회 / 학교 메일 5회 (계정당) |
| 쿨다운 | SMS 90초 / 학교 메일 60초 |
| 코드 입력 시도 | 채널당 최대 5회 |

운영에서 실SMS를 열 때:

```
NEXT_PUBLIC_ENABLE_PHONE_SMS=true
NEXT_PUBLIC_PHONE_TEST_ONLY=false
```

Firebase Console에서도 **Phone numbers for testing** + SMS 사용량 알림/예산 한도를 꼭 설정하세요.  
프론트 가드는 우회 가능하므로, 장기적으로는 Cloud Functions + App Check로 서버 강제하는 것이 안전합니다.

## 3. Create Firestore

Firestore Database → Create database (production mode), then paste the rules below.

## 4. Enable Storage (프로필 사진)

콘솔 에러에 `CORS policy` / `firebasestorage.googleapis.com` 이 보이면 Storage가 아직 준비되지 않았거나 CORS가 막힌 경우입니다.

### 4-1. Storage 활성화 + 규칙

1. Firebase Console → **Build → Storage → Get started**
2. 규칙에 프로젝트 루트 `storage.rules` 내용 붙여넣기 (또는 CLI 배포)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profilePhotos/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

CLI로 배포하려면:

```bash
npm i -g firebase-tools
firebase login
firebase use misaeng-community
firebase deploy --only storage
```

### 4-2. localhost CORS 허용 (중요)

GCS 버킷에 CORS를 한 번 설정해야 `http://localhost:3000`에서 업로드가 됩니다.

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) 설치 후 로그인
2. 프로젝트 루트의 `storage.cors.json` 사용:

```bash
# 새 버킷 이름 (.firebasestorage.app)
gsutil cors set storage.cors.json gs://misaeng-community.firebasestorage.app

# 안 되면 예전 버킷 이름도 시도
gsutil cors set storage.cors.json gs://misaeng-community.appspot.com

# 확인
gsutil cors get gs://misaeng-community.firebasestorage.app
```

### 4-3. Env 확인

`.env.local`의 `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`이 Console Storage에 보이는 버킷과 같아야 합니다.

예: `misaeng-community.firebasestorage.app`

## 5. Firestore Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isMisaeng() {
      return signedIn()
        && request.auth.token.email.matches('.*@misaeng[.]com$');
    }

    function isAuthor(data) {
      return signedIn() && request.auth.uid == data.authorUid;
    }

    match /housingPosts/{postId} {
      allow read: if true;
      allow create: if isMisaeng()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.authorEmail == request.auth.token.email
        && request.resource.data.status == 'open';
      allow update, delete: if isAuthor(resource.data) && isMisaeng();
    }

    match /roommatePosts/{postId} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.authorEmail == request.auth.token.email
        && request.resource.data.status == 'open';
      allow update, delete: if isAuthor(resource.data);
    }

    match /communityPosts/{postId} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.authorUid == request.auth.uid
        && request.resource.data.authorEmail == request.auth.token.email
        && request.resource.data.status == 'open'
        && request.resource.data.categoryId in [
          'events',
          'food',
          'marketplace',
          'cpt-opt',
          'visa',
          'job-review',
          'green-card'
        ];
      allow update, delete: if isAuthor(resource.data);
    }

    match /users/{uid} {
      allow read: if true;
      allow create, update: if signedIn() && request.auth.uid == uid;
    }
  }
}
```

> Roommate “one open listing” is enforced in the app (`findRoommatePostByAuthor` before create). Rules above still require authentication for writes.
> Google 로그인 시에도 `users/{uid}.photoURL`은 기본 null이며, 마이페이지에서 직접 올린 사진만 저장됩니다.

## 6. Env vars

Copy `.env.example` → `.env.local` and fill:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Restart `npm run dev` after changing env vars.

## Routes

| Path | Purpose |
|------|---------|
| `/nyc` | Hub |
| `/nyc/login` | Sign in / sign up |
| `/nyc/me` | My page (로그아웃 · 프로필 사진) |
| `/nyc/housing` | Housing list |
| `/nyc/housing/new` | Create (@misaeng.com only) |
| `/nyc/housing/[id]` | Shareable detail |
| `/nyc/roommate` | Roommate list |
| `/nyc/roommate/new` | Create (1 open post / user) |
| `/nyc/roommate/[id]` | Shareable detail |
