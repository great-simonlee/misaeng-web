# EmailJS 연동 가이드

Contact 페이지 폼에서 이메일을 전송하려면 EmailJS를 연동하면 됩니다.

**전송 흐름**: 문의 제출 시 **동시에 두 통**이 나갑니다.  
1. **나에게 (관리자)** → 문의 내용이 담긴 메일이 회사/관리자 이메일로 전송  
2. **보낸 사람에게 (확인 메일)** → “메시지를 받았습니다” 안내 메일이 문의자 이메일(`{{email}}`)로 전송  

확인 이메일까지 쓰려면 **확인용 템플릿**을 하나 더 만들고, 아래 환경 변수를 설정하면 됩니다.

---

## 1. EmailJS 대시보드에서 확인할 값

[EmailJS 대시보드](https://dashboard.emailjs.com/)에서 아래 세 가지를 확인합니다.

| 항목 | 설명 | 위치 |
|------|------|------|
| **Public Key** | 클라이언트에서 사용하는 공개 키 | Account → API Keys |
| **Service ID** | 연결한 이메일 서비스(Gmail, Outlook 등) ID | Email Services |
| **Template ID** | 사용할 이메일 템플릿 ID | Email Templates |

---

## 2. 패키지 설치

```bash
npm install @emailjs/browser
```

---

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래를 넣습니다.

```env
# 필수: 관리자용 문의 메일 전송에 사용
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key

# 선택: 보낸 사람에게 확인 이메일을 보낼 때 사용 (설정하면 동시에 두 통 전송)
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION=your_confirmation_template_id
```

- **Public Key**: EmailJS 대시보드 **Account → API Keys**에서 복사  
- **Confirmation Template ID**: 확인 이메일용 템플릿을 만든 뒤, 해당 템플릿 ID를 넣습니다. 비워두면 **관리자에게만** 한 통만 전송됩니다.

---

## 4. 템플릿 구성

### 4-1. Contact Us (관리자용) — 필수

| 항목 | 값 |
|------|-----|
| Service ID | `service_2q2yz67` (Misaeng Contact) |
| Template ID | `template_i09sdw` (Contact Us) |
| To Email | 회사/관리자 이메일 (고정) |
| Reply To | `{{email}}` (답장 시 문의자 주소로) |
| 템플릿 변수 | `{{name}}`, `{{email}}`, `{{message}}` |

HTML 본문은 `docs/emailjs-contact-template.html` 내용을 복사해 붙여넣습니다.

### 4-2. Contact Confirmation (보낸 사람 확인용) — 선택

확인 이메일까지 보내려면 **새 템플릿**을 하나 만듭니다.

| 항목 | 값 |
|------|-----|
| Service ID | 위와 동일 (`service_2q2yz67`) |
| Template ID | 대시보드에서 생성 후 ID 복사 → `.env.local`의 `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION`에 입력 |
| **To Email** | **`{{email}}`** (문의를 보낸 사람 주소로 전달되도록 반드시 설정) |
| Subject | 예: `We received your message – Misaeng` |
| 템플릿 변수 | `{{name}}`, `{{email}}` (본문에 사용할 수 있음) |

HTML 본문은 `docs/emailjs-confirmation-template.html` 내용을 복사해 붙여넣습니다.

---

## 5. 연동 상태

- [x] `ContactScreen.tsx`에서 관리자용 + 확인용 이메일 동시 전송 (확인 템플릿 ID 설정 시)
- [x] 템플릿 파라미터: `name`, `email`, `message`
- [x] 제출 중 버튼 비활성화 및 "Sending…" 표시
- [x] 성공/에러 메시지 표시
- [ ] `.env.local`에 `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` 설정
- [ ] (선택) 확인 이메일용 템플릿 생성 후 `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION` 설정
- [ ] 로컬에서 전송 테스트 후 배포 도메인 Allowed list 추가

---

## 6. CORS / 도메인 제한

EmailJS 대시보드에서 **Allowed list**에  
로컬 개발용 `http://localhost:3000` 과 배포 도메인을 추가해 두면 됩니다.

---

## 7. 체크리스트

- [x] `npm install @emailjs/browser` 실행
- [ ] `.env.local` 에 `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` 설정 (Account → API Keys에서 복사)
- [x] Contact Us 템플릿 변수 `name`, `email`, `message` 사용
- [x] `ContactScreen.tsx` 에 send 연동 및 성공/에러 UI
- [ ] (선택) 확인 이메일 템플릿 생성 → To Email `{{email}}`, 본문은 `docs/emailjs-confirmation-template.html` 참고 → Template ID를 `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CONFIRMATION`에 설정
- [ ] 로컬에서 전송 테스트 후 배포 도메인 Allowed list 추가
