import type { LegalDocument } from '@lib/constants/legalDocument'

/** Misaeng · Ellieo Privacy Policy (apps + misaeng.com) — English controls; Korean and Vietnamese are convenience translations */
export const NYC_PRIVACY_POLICY: LegalDocument = {
  eyebrow: 'LEGAL',
  title: 'Privacy Policy',
  titleKo: '개인정보처리방침',
  version: '2026-11-23',
  lastUpdated: 'November 23, 2026',
  lastUpdatedKo: '2026년 11월 23일',
  effectiveDate: 'November 23, 2026',
  effectiveDateKo: '2026년 11월 23일',
  contactEmail: 'info@misaeng.com',
  companyName: 'Misaeng LLC',
  companyAddress:
    '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
  languageNotice: {
    en: 'The English version of this Privacy Policy is the official and controlling version. Korean and Vietnamese translations are provided for convenience only; a paragraph that has not yet been translated is shown in English. If there is any conflict or inconsistency between the English version and a translation, the English version prevails.',
    ko: '본 개인정보처리방침의 영문본이 공식·기준 문서이며, 한국어·베트남어 번역본은 이해를 돕기 위한 참고용입니다(아직 번역되지 않은 문단은 영어로 표시됩니다). 영문본과 번역본에 차이·불일치가 있을 경우 영문본이 우선합니다.',
  },
  intro: [
    {
      en: 'Misaeng LLC (“Company,” “we,” “us,” or “Misaeng”) provides this Privacy Policy (the “Policy”) to explain how we collect, use, store, and share personal information in connection with the Misaeng mobile apps for iOS and Android, the misaeng.com websites (including our New York and Boston communities), the multilingual edition Ellieo, and related services (the “Services”). Misaeng and Ellieo share one account system and one database, so this Policy applies to both.',
      ko: 'Misaeng LLC(이하 “회사”, “당사”, “Misaeng”)는 iOS·Android용 미생 모바일 앱, misaeng.com 웹사이트(뉴욕·보스턴 커뮤니티 포함), 다국어 서비스 Ellieo 및 관련 서비스(이하 “서비스”)를 제공하면서 이용자의 개인정보를 소중히 다루기 위해 본 개인정보처리방침(이하 “본 방침”)을 공개합니다. 미생과 Ellieo는 하나의 계정 체계와 데이터베이스를 공유하므로 본 방침은 두 서비스 모두에 적용됩니다.',
    },
    {
      en: 'This Policy describes what information we collect, how we use it, what choices and rights you may have, and how to contact us. In some cases, continued use of the Services may be treated as acceptance of the processing described here. If you do not agree, please stop using the Services.',
      ko: '본 방침은 회사가 어떤 정보를 수집·이용·보관·공유하는지, 이용자가 어떤 선택권과 권리를 가지는지, 그리고 문의 방법을 설명합니다. 서비스를 이용하면 본 방침에 기재된 처리에 동의한 것으로 볼 수 있는 경우가 있으므로, 동의하지 않으면 서비스 이용을 중단해 주세요.',
    },
    {
      en: 'This Policy applies together with our Terms of Use. Terms used here may have the same meaning as in the Terms of Use.',
      ko: '본 방침은 「이용약관(Terms of Use)」과 함께 적용됩니다. 용어의 의미는 약관과 동일하게 해석될 수 있습니다.',
    },
  ],
  sections: [
    {
      id: 'controller',
      title: '1. Who We Are',
      titleKo: '1. 개인정보 처리 주체',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              en: 'Operator: Misaeng LLC',
              ko: '운영 주체: Misaeng LLC',
            },
            {
              en: 'Address: 45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
              ko: '주소: 45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
            },
            {
              en: 'Privacy inquiries: info@misaeng.com',
              ko: '개인정보 관련 문의: info@misaeng.com',
            },
          ],
        },
        {
          type: 'p',
          en: 'We operate the Services from New York, United States. Depending on where you live, additional privacy rights may apply, as described later in this Policy.',
          ko: '회사는 미국 New York에 기반을 두고 서비스를 운영합니다. 이용자의 거주 지역에 따라 추가적인 프라이버시 권리가 적용될 수 있으며, 해당 내용은 본 방침 후반부에서 안내합니다.',
        },
      ],
    },
    {
      id: 'scope',
      title: '2. Scope',
      titleKo: '2. 적용 범위',
      blocks: [
        {
          type: 'p',
          en: 'This Policy applies to the Misaeng mobile apps for iOS and Android, the misaeng.com websites (including our New York and Boston communities), and our related services, including Community Boards, Housing, the Marketplace, Coffee Chats, Career Questions, Premium, login, My Page, Misaeng Points, inquiries, and notifications.',
          ko: '본 방침은 iOS·Android용 미생 모바일 앱, misaeng.com 웹사이트(뉴욕·보스턴 커뮤니티 포함) 및 관련 서비스(커뮤니티 게시판, 하우징, 중고거래, 커피챗, 커리어 질문, Premium, 로그인, 마이페이지, 미생 포인트, 문의, 알림 등)에 적용됩니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Third-party websites, apps, and social media (for example Instagram, YouTube, map providers, or login providers) are governed by those providers’ policies.',
              ko: '제3자 웹사이트·앱·소셜 미디어(예: Instagram, YouTube, 지도 제공자, 로그인 제공자)에는 해당 사업자의 정책이 적용됩니다.',
            },
            {
              en: 'Information you voluntarily post on public boards may be viewed by other Users, and the Company cannot control all downstream reuse or redistribution.',
              ko: '이용자가 공개 게시판에 스스로 게시한 정보는 다른 이용자에게 열람될 수 있으며, 그 재사용·재배포에 대해 회사가 모든 통제력을 갖지는 않습니다.',
            },
            {
              en: 'If a separate notice applies to the corporate site (careers, company introduction, etc.), that notice may control for those pages.',
              ko: '채용·회사 소개 등 법인 사이트(별도 도메인/경로)에 별도의 고지가 있는 경우 해당 고지가 우선할 수 있습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'collect',
      title: '3. Information We Collect',
      titleKo: '3. 수집하는 정보의 유형',
      blocks: [
        {
          type: 'p',
          en: 'We may collect the categories of information below as needed to provide the Services. Exact items depend on the features you use, your settings, your device, and the time of collection.',
          ko: '회사는 서비스 제공에 필요한 범위에서 아래 범주의 정보를 수집할 수 있습니다. 실제 수집 항목은 이용 기능·설정·기기·시점에 따라 달라질 수 있습니다.',
        },
        {
          type: 'p',
          en: '3.1 Information you provide directly',
          ko: '3.1 이용자가 직접 제공하는 정보',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Account and profile: email address, password (stored only in hashed form), display name/nickname, profile photo, bio, and preference settings, including your preferred language. Optional profile details you choose to add: MBTI, gender, and occupation',
              ko: '계정·프로필: 이메일 주소, 비밀번호(해시 형태로만 저장), 표시 이름/닉네임, 프로필 사진, 자기소개, 선호 설정(선호 언어 포함). 이용자가 선택해 추가하는 프로필 정보: MBTI, 성별, 직업',
            },
            {
              en: 'Verification-related: school (or recognized institution) email, verification status, school name/identifier, and confirmation details submitted during verification',
              ko: '인증 관련: 학교(또는 인정 기관) 이메일, 인증 상태, 소속 학교명·식별자, 인증 과정에서 제출하는 확인 정보',
            },
            {
              en: 'Workplace verification: whether you are verifying a current or former workplace, the company name, and either your work email (confirmed with a code) or the workplace documents you upload. Both methods create a review request that our team checks before approval',
              ko: '직장 인증: 현재 직장인지 이전 직장인지, 회사 이름, 그리고 코드로 확인한 회사 이메일 또는 업로드한 직장 인증 서류. 두 방법 모두 검토 요청이 만들어지며, 미생 팀이 확인한 뒤 승인합니다',
            },
            {
              en: 'Workplace documents (optional): an employment verification letter, offer letter, separation or resignation email, W-2, paystub/payslip, or employee ID card, used only to confirm your current or former workplace. You must hide salary and other amounts, Social Security numbers, and personal information not needed for this purpose before uploading. We remove file metadata on upload, store the files in a private storage bucket that only our review team can access, and delete them within 72 hours after the decision and in any case no later than 7 days after upload. Only the result (approved or rejected, current or former workplace, and the company name) is kept',
              ko: '직장 인증 서류(선택): 재직증명서, 오퍼 레터, 퇴직·퇴사 관련 이메일, W-2, 페이스텁/페이슬립, 사원증 등으로, 현재 또는 이전 직장을 확인하는 데에만 사용합니다. 올리기 전에 급여 등 금액, 사회보장번호(SSN), 이 목적에 필요하지 않은 개인정보를 가려야 합니다. 업로드할 때 파일 메타데이터를 제거하고, 검토 팀만 접근할 수 있는 비공개 저장소에 보관하며, 결정 후 72시간 이내, 어떤 경우에도 업로드 후 7일 이내에 삭제합니다. 결과(승인·거절, 현재·이전 직장, 회사 이름)만 보관합니다',
            },
            {
              en: 'Parent accounts: if you join through a student’s parent invite link, your account is a parent account linked to the inviting student. We keep the link (who invited whom and when the parent joined), which administrators can see and which we use to prevent abuse and to pay the invite reward. Parent accounts do not go through school or workplace verification',
              ko: '학부모 계정: 학생의 부모님 초대 링크로 가입하면 초대한 학생과 연결된 학부모 계정이 됩니다. 연결 정보(누가 누구를 초대했는지, 가입 시각)를 보관하며, 관리자가 볼 수 있고 부정 사용 방지와 초대 보상 지급에 사용합니다. 학부모 계정은 학교·직장 인증을 하지 않습니다',
            },
            {
              en: 'Posts and communications: post titles, body text, images/attachments, comments, report reasons and details, inquiry messages, and feedback, together with the language they were written in and their translations',
              ko: '게시·소통: 게시글 제목·본문·이미지·첨부, 댓글, 신고 사유·내용, 문의 메시지, 피드백 및 작성 언어와 번역문',
            },
            {
              en: 'Listing/recruitment details you choose to include: roommate/sublet conditions, contact methods you voluntarily disclose, preferred areas, budget, and similar',
              ko: '거래·모집 관련 기재 정보: 룸메이트/서블렛 조건, 연락 방법(이용자가 자발적으로 공개한 경우), 희망 지역·예산 등',
            },
            {
              en: 'Marketplace listings and inquiry messages: item details, photos, price, accepted payment methods, the ZIP code of the trade area, and messages between buyers and sellers (see Section 5)',
              ko: '중고거래 등록 글 및 문의 메시지: 물품 정보, 사진, 가격, 받는 결제 방법, 거래 지역 ZIP 코드, 구매자·판매자 간 메시지(제5조 참고)',
            },
            {
              en: 'Misaeng Points: points earned and spent, the activity that earned them (for example a review, a quiz, or an invite), and reward applications with the contact and scheduling details needed to fulfill them',
              ko: '미생 포인트: 적립·사용 내역, 적립의 근거가 된 활동(예: 후기, 퀴즈, 초대), 보상 신청 내용과 이행에 필요한 연락·일정 정보',
            },
            {
              en: 'Sign-in: if you use Sign in with Apple or Google sign-in, the identifier and email address that provider shares with us (Apple may share a private relay email address), and, for Sign in with Apple, a token we use to revoke the connection when you delete your account',
              ko: '로그인: Apple로 로그인 또는 Google 로그인을 사용하면 해당 제공자가 전달하는 식별자와 이메일 주소(Apple은 비공개 릴레이 이메일일 수 있음), Apple로 로그인의 경우 계정 삭제 시 연결을 해제하는 데 쓰는 토큰',
            },
            {
              en: 'Instagram verification (optional): your Instagram handle and verification status if you choose to verify it; only the fact that it is verified is shown to others',
              ko: '인스타그램 인증(선택): 인증을 선택한 경우 인스타그램 아이디와 인증 상태. 다른 이용자에게는 인증 여부만 표시됩니다',
            },
            {
              en: 'Coffee Chats and Career Questions: your mentor card (for example your workplace, role, and topics), the times you are available, requests, questions and answers, their status, and the LinkedIn profile URL you choose to share, which is shown to the other person only after a request is accepted',
              ko: '커피챗·커리어 질문: 멘토 카드(예: 직장, 직무, 주제), 가능한 시간, 신청·질문·답변 내용과 진행 상태, 이용자가 공유하기로 한 LinkedIn 프로필 주소(신청이 수락된 뒤 상대방에게만 표시)',
            },
            {
              en: 'Notifications: your device push token, device platform, app language, and alert settings (for example new job postings, visa news, comments, messages, company follows, and the boards you choose to get new-post alerts for), so that we can deliver alerts through Apple Push Notification service and Firebase Cloud Messaging',
              ko: '알림: 기기 푸시 토큰, 기기 종류, 앱 언어, 알림 설정(예: 새 채용 공고, 비자 뉴스, 댓글, 메시지, 관심 회사, 새 글 알림을 켠 게시판). Apple Push Notification service와 Firebase Cloud Messaging으로 알림을 보내는 데 사용합니다',
            },
            {
              en: 'Marketing/partnership inquiries: name, contact details, company/channel information, and message content',
              ko: '마케팅·제휴 문의: 이름, 연락처, 회사/채널 정보, 문의 내용',
            },
          ],
        },
        {
          type: 'p',
          en: '3.2 Information collected automatically',
          ko: '3.2 서비스 이용 과정에서 자동 수집되는 정보',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Log and device data: IP address, browser type/language, operating system, device-related identifiers, access timestamps, referrer URL, and error logs',
              ko: '로그·기기 정보: IP 주소, 브라우저 유형·언어, 운영체제, 디바이스 식별에 준하는 정보, 접속 일시, 참조 URL, 오류 로그',
            },
            {
              en: 'Usage data: pages or posts viewed, search queries (when used), approximate interactions such as clicks/scrolls, and session information',
              ko: '이용 기록: 열람한 페이지·게시물, 검색어(해당 기능 사용 시), 클릭·스크롤 등 대략적 상호작용, 세션 정보',
            },
            {
              en: 'Cookies and similar technologies: cookies and local storage used for login persistence, preferences, and security. We do not use third-party advertising or analytics trackers; we keep only first-party, aggregated usage counts (for example how often a map is opened) to improve the Services',
              ko: '쿠키 및 유사 기술: 로그인 유지, 선호 설정, 보안에 사용되는 쿠키·로컬 스토리지. 회사는 제3자 광고·분석 추적 도구를 사용하지 않으며, 서비스 개선을 위해 지도 열람 횟수 등 집계된 자체 이용 통계만 보관합니다',
            },
            {
              en: 'Approximate location: region inferred from IP (precise GPS is not necessarily required by default)',
              ko: '대략적 위치: IP 기반 추정 지역(정밀 GPS를 기본적으로 요구하지 않을 수 있음)',
            },
          ],
        },
        {
          type: 'p',
          en: '3.3 Information from third parties',
          ko: '3.3 제3자로부터 받는 정보',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'From sign-in providers (Apple and Google): identifiers, email, and basic profile information within the scope you authorize',
              ko: '로그인 제공자(Apple, Google)로부터 이용자가 허용한 범위의 식별자·이메일·프로필 기본 정보',
            },
            {
              en: 'From payment processors (Stripe and Apple): the status of your Premium purchase or subscription, as described in Section 3.4',
              ko: '결제 처리자(Stripe, Apple)로부터 Premium 구매·구독 상태(제3.4조 참고)',
            },
            {
              en: 'From maps/place APIs: place metadata returned in response to your searches, used to provide Service features',
              ko: '지도·장소 API 등에서 이용자 검색에 따라 반환되는 장소 메타데이터(서비스 기능 제공 목적)',
            },
            {
              en: 'From partners, agencies, or security vendors: limited information for fraud detection and support',
              ko: '파트너·대행사·보안 벤더가 부정행위 탐지·지원을 위해 제공하는 제한적 정보',
            },
          ],
        },
        {
          type: 'p',
          en: '3.4 Premium and payments',
          ko: '3.4 Premium 및 결제',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Web purchases: payment is processed by Stripe, Inc. We receive your plan, subscription status, trial and renewal dates, the brand and last four digits of your card, and Stripe customer and subscription IDs. We never receive or store your full card number.',
              ko: '웹 결제: Stripe, Inc.가 결제를 처리합니다. 회사는 요금제, 구독 상태, 체험·갱신 날짜, 카드사와 카드 끝 4자리, Stripe 고객·구독 ID를 받으며, 카드 번호 전체는 받거나 저장하지 않습니다.',
            },
            {
              en: 'iOS app purchases: payment is processed by Apple. Apple sends us the transaction and subscription status for your account; we do not receive your payment details.',
              ko: 'iOS 앱 결제: Apple이 결제를 처리하며, 이용자 계정의 거래·구독 상태만 회사에 전달합니다. 회사는 결제 정보를 받지 않습니다.',
            },
            {
              en: 'Premium codes: the code you redeem, when you redeemed it, and when the access ends.',
              ko: 'Premium 코드: 사용한 코드, 사용 시각, 이용 종료일.',
            },
            {
              en: 'We use this information to provide Premium on the website and in the apps, send trial-ending and renewal reminders, handle cancellations and refunds, and prevent fraud. Payment records are kept for as long as tax and accounting laws require (generally up to 7 years).',
              ko: '회사는 이 정보를 웹사이트와 앱에서 Premium 제공, 체험 종료·갱신 안내, 해지·환불 처리, 부정 이용 방지에 사용합니다. 결제 기록은 세무·회계 법령이 요구하는 기간(일반적으로 최대 7년) 동안 보관합니다.',
            },
          ],
        },
        {
          type: 'note',
          en: 'We do not intentionally require sensitive information (such as health, biometrics, precise location, race/ethnicity, religion, or sexual orientation). If you voluntarily include such information in posts or inquiries, it may be stored and displayed, so please post carefully.',
          ko: '민감정보(건강, 생체, 정확한 위치, 인종·민족, 종교, 성적 지향 등)를 의도적으로 요구하지 않습니다. 다만 이용자가 게시물·문의에 자발적으로 포함하는 경우 해당 내용이 저장·표시될 수 있으므로 게시에 신중해야 합니다.',
        },
      ],
    },
    {
      id: 'anonymous-privacy',
      title: '4. Anonymous Board and Personal Information',
      titleKo: '4. 익명게시판과 개인정보',
      blocks: [
        {
          type: 'p',
          en: 'On the Anonymous Board, your name, school, and profile photo may generally be hidden or masked from other Users. This is “display anonymity” only and does not mean:',
          ko: '익명게시판에서는 다른 이용자에게 작성자의 이름·학교·프로필 사진 등이 기본적으로 보이지 않거나 마스킹될 수 있습니다. 그러나 이는 “대외 표시상의 익명”이며 다음을 의미하지 않습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'that you are technically unidentifiable to the Company;',
              ko: '회사에 대해 작성자가 기술적으로 전혀 식별되지 않는다는 의미',
            },
            {
              en: 'that no login, account, server log, or report-handling records are created; or',
              ko: '로그인·계정·서버 로그·신고 대응 기록이 생성되지 않는다는 의미',
            },
            {
              en: 'that records will never be reviewed for legal, investigative, or rights-enforcement purposes.',
              ko: '법령·수사·권리 침해 대응 시에도 절대 확인되지 않는다는 의미',
            },
          ],
        },
        {
          type: 'p',
          en: 'For operations, abuse prevention, User safety, and legal compliance, the Company may associate anonymously displayed posts with account and log data. See the Anonymous Board section of the Terms of Use for related User responsibilities.',
          ko: '회사는 서비스 운영, 부정이용 방지, 이용자 안전, 법적 의무 이행을 위해 익명으로 표시된 게시물과 계정·로그를 연결하여 처리할 수 있습니다. 자세한 이용자 책임은 이용약관의 익명게시판 조항을 참고하세요.',
        },
        {
          type: 'p',
          en: 'Anonymous posts and comments on the Q&A/Free board created after this feature was introduced (November 2026) show the kind of the author’s verification badge — “Student,” “Workplace verified,” or “Parent.” They never show the author’s nickname or school name. Anonymous posts and comments created before this change remain fully anonymous.',
          ko: '이 기능이 도입된 뒤(2026년 11월) 질문·자유 게시판에 작성되는 익명 글·댓글에는 작성자의 인증 배지 종류(“학생”, “직장인 인증”, “학부모”)가 표시됩니다. 작성자의 닉네임이나 학교 이름은 표시되지 않습니다. 이 변경 전에 작성된 익명 글·댓글은 완전한 익명으로 남습니다.',
        },
        {
          type: 'p',
          en: 'If you have not set a nickname, the part of your email address before the “@” (for example, “andy42680” for andy42680@gmail.com) is shown as a temporary nickname next to your non-anonymous posts and comments until you set one. The domain after the “@” is never shown. You can set or change your nickname at any time in your profile.',
          ko: '닉네임을 설정하지 않은 경우, 닉네임을 정할 때까지 익명이 아닌 글·댓글에 이메일 주소의 “@” 앞부분(예: andy42680@gmail.com의 “andy42680”)이 임시 닉네임으로 표시됩니다. “@” 뒤의 도메인은 표시되지 않습니다. 닉네임은 프로필에서 언제든 설정하거나 바꿀 수 있습니다.',
        },
      ],
    },
    {
      id: 'marketplace-privacy',
      title: '5. Marketplace Information',
      titleKo: '5. 중고거래 관련 정보',
      blocks: [
        {
          type: 'p',
          en: 'When you use the Marketplace (the used-goods board described in Section 10 of the Terms of Use), we process the following information in addition to the information described in Section 3:',
          ko: '이용자가 중고거래(이용약관 제10조에 기재된 중고거래 게시판)를 이용하면, 회사는 제3조에 기재된 정보에 더하여 다음 정보를 처리합니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Listing content: title, description, photos (up to six), category, asking price or “free,” the payment methods you accept (cash, Zelle, Venmo, or other), the ZIP code of the trade area, the listing’s status (selling, reserved, or sold) and its changes, and view counts',
              ko: '등록 글 내용: 제목, 설명, 사진(최대 6장), 카테고리, 희망 가격 또는 “나눔”, 받는 결제 방법(현금, Zelle, Venmo, 그 외), 거래 지역 ZIP 코드, 거래 상태(판매중·예약중·판매완료)와 그 변경, 조회수',
            },
            {
              en: 'Inquiry conversations: messages between a buyer and a seller about a listing, who sent each message and when, unread counts, and whether the conversation is open or closed',
              ko: '문의 대화: 등록 글에 관한 구매자·판매자 간 메시지, 각 메시지의 발신자와 시각, 읽지 않은 메시지 수, 대화의 열림·닫힘 상태',
            },
            {
              en: 'Reports and blocks: the reason and details of a report, the most recent messages of a reported conversation, and the Users you block',
              ko: '신고 및 차단: 신고 사유와 내용, 신고된 대화의 최근 메시지, 이용자가 차단한 사용자',
            },
            {
              en: 'Agreements: when you agree to the community posting guidelines before listing an item, we keep a record of the guidelines version, the time, your account ID and email, IP address, and browser or device information. Your agreement to the safe-trading rules is stored only on your device, for 24 hours, so that you are not asked again, and is not sent to us',
              ko: '동의 기록: 물품 등록 전 커뮤니티 작성 가이드라인에 동의하면 가이드라인 버전, 동의 시각, 계정 ID와 이메일, IP 주소, 브라우저·기기 정보를 기록합니다. 안전 거래 수칙 동의는 다시 묻지 않도록 이용자 기기에만 24시간 동안 저장되며, 회사로 전송되지 않습니다',
            },
            {
              en: 'Notifications: your device’s push notification token, used to notify you of new inquiries and messages',
              ko: '알림: 새 문의와 메시지를 알려 드리기 위한 기기의 푸시 알림 토큰',
            },
          ],
        },
        {
          type: 'note',
          en: 'We do not ask for your exact address, and we do not receive or process payment details (such as bank, Zelle, or Venmo account information) for Marketplace trades. Payment happens directly between Users outside the Services.',
          ko: '회사는 정확한 주소를 요구하지 않으며, 중고거래 결제 정보(은행·Zelle·Venmo 계정 정보 등)를 받거나 처리하지 않습니다. 결제는 서비스 밖에서 이용자 간에 직접 이루어집니다.',
        },
        {
          type: 'p',
          en: 'What other Users can see:',
          ko: '다른 이용자에게 보이는 정보:',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Listings—including photos, price, accepted payment methods, status, view count, ZIP code, and the approximate area on a map—are visible to other Users of Misaeng NYC and Ellieo, and to anyone who opens a shared link to the listing, together with your display name and profile photo. Listings may be shown in translation.',
              ko: '등록 글(사진, 가격, 받는 결제 방법, 거래 상태, 조회수, ZIP 코드, 지도상의 대략적인 지역 포함)은 이용자의 표시 이름·프로필 사진과 함께 Misaeng NYC와 Ellieo의 다른 이용자, 그리고 공유된 링크를 연 누구에게나 보일 수 있으며, 번역문으로 표시될 수 있습니다.',
            },
            {
              en: 'Inquiry messages are visible only to the buyer and the seller in that conversation (each sees the other’s display name and profile photo), and to the Company where needed to operate the Services, review reports, prevent fraud, or comply with law.',
              ko: '문의 메시지는 해당 대화의 구매자와 판매자(서로의 표시 이름·프로필 사진이 보임)에게만 보이며, 회사는 서비스 운영, 신고 검토, 사기 방지, 법령 준수에 필요한 경우 이를 확인할 수 있습니다.',
            },
            {
              en: 'Anything you write in a listing or message, including contact details, can be seen by the other side. Do not include phone numbers, email addresses, messenger IDs, or home addresses.',
              ko: '등록 글이나 메시지에 쓴 내용은 연락처를 포함하여 상대방에게 보입니다. 전화번호, 이메일 주소, 메신저 ID, 집 주소는 적지 마세요.',
            },
          ],
        },
        {
          type: 'p',
          en: 'Map and location providers:',
          ko: '지도 및 위치 제공자:',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'To show a listing’s area on a map, our server sends only the 5-digit ZIP code—not your account information or an address—to the OpenStreetMap Nominatim geocoding service to look up the approximate center of that ZIP code, and caches the result. If that lookup fails, the iOS app may ask Apple’s geocoding service on your device to look up the same ZIP code.',
              ko: '등록 글의 지역을 지도에 표시하기 위해, 회사 서버는 5자리 ZIP 코드만(계정 정보나 주소는 제외) OpenStreetMap Nominatim 지오코딩 서비스로 보내 해당 ZIP 코드의 대략적인 중심 좌표를 조회하고 그 결과를 캐시합니다. 조회에 실패하면 iOS 앱이 기기에서 Apple의 지오코딩 서비스로 같은 ZIP 코드를 조회할 수 있습니다.',
            },
            {
              en: 'In the apps, the map is displayed by your device’s map service (for example Apple Maps on iOS). When you tap the map or open the area in a maps app such as Apple Maps or Google Maps, the ZIP code or its approximate coordinates are passed to that app, and its provider’s privacy policy applies.',
              ko: '앱의 지도는 기기의 지도 서비스(예: iOS의 Apple 지도)로 표시됩니다. 지도를 누르거나 Apple 지도·Google 지도 등 지도 앱에서 지역을 열면 ZIP 코드 또는 그 대략적인 좌표가 해당 앱으로 전달되며, 그 제공자의 개인정보처리방침이 적용됩니다.',
            },
          ],
        },
        {
          type: 'p',
          en: 'We use this information to show listings and their approximate trade area, deliver inquiry messages and notifications, translate listings (see Section 8), limit spam, review reports, prevent fraud, enforce the Terms of Use, and cooperate with law enforcement where required. Listings are kept until you delete them or they are removed. Deleting a listing or marking it sold closes its conversations but does not immediately erase them; inquiry conversations are kept for as long as needed to show them to their participants, handle reports and disputes, and prevent fraud, as described in Section 10. When you delete your account, your listings (with their photos) and every inquiry conversation you took part in, as buyer or seller, are deleted, including the other participant’s copy; a report already sent to us keeps the messages it included.',
          ko: '회사는 이 정보를 등록 글과 대략적인 거래 지역 표시, 문의 메시지·알림 전달, 등록 글 번역(제8조 참고), 스팸 제한, 신고 검토, 사기 방지, 이용약관 집행, 필요한 경우 수사기관 협조에 이용합니다. 등록 글은 이용자가 삭제하거나 운영상 삭제될 때까지 보관됩니다. 등록 글을 삭제하거나 판매완료로 바꾸면 그 대화는 닫히지만 즉시 지워지지는 않으며, 문의 대화는 제10조에 기재된 대로 참여자에게 보여 주고 신고·분쟁에 대응하며 사기를 방지하는 데 필요한 기간 동안 보관됩니다. 계정을 삭제하면 이용자의 등록 글(사진 포함)과 이용자가 구매자 또는 판매자로 참여한 모든 문의 대화가 상대방에게 보이는 대화까지 함께 삭제됩니다. 다만 이미 접수된 신고에 포함된 메시지는 신고 기록에 남습니다.',
        },
      ],
    },
    {
      id: 'purpose',
      title: '6. How We Use Information',
      titleKo: '6. 이용 목적',
      blocks: [
        {
          type: 'p',
          en: 'We use collected information for the following purposes:',
          ko: '회사는 수집한 정보를 다음 목적에 이용합니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Creating and authenticating accounts, maintaining sessions, and providing My Page',
              ko: '계정 생성·인증·로그인·세션 유지 및 마이페이지 제공',
            },
            {
              en: 'Providing community features such as posts, comments, saves, notices, and search',
              ko: '게시·댓글·찜·알림·검색 등 커뮤니티 기능 제공',
            },
            {
              en: 'Translating posts, comments, and listings into other languages and showing them on Misaeng NYC and Ellieo in your preferred language (see the Terms of Use, Section 6)',
              ko: '게시물·댓글·매물을 다른 언어로 번역하여 Misaeng NYC와 Ellieo에서 이용자의 선호 언어로 표시(이용약관 제6조 참고)',
            },
            {
              en: 'Managing School Email Verification and posting permissions',
              ko: '학교 이메일 인증 및 작성 권한 관리',
            },
            {
              en: 'Supporting Housing and roommate browsing/submission features',
              ko: '하우징·룸메이트 등 정보 열람·등록 지원',
            },
            {
              en: 'Operating the Marketplace: showing listings and their approximate trade area, delivering inquiry messages and notifications, and investigating reports of fraud or abuse (see Section 5)',
              ko: '중고거래 운영: 등록 글과 대략적인 거래 지역 표시, 문의 메시지·알림 전달, 사기·부정이용 신고 조사(제5조 참고)',
            },
            {
              en: 'Running Misaeng Points: calculating points, preventing fraudulent earning, and processing reward applications',
              ko: '미생 포인트 운영: 포인트 산정, 부정 적립 방지, 보상 신청 처리',
            },
            {
              en: 'Providing Premium, processing payments, cancellations, and refunds, and sending subscription reminders (see Section 3.4)',
              ko: 'Premium 제공, 결제·해지·환불 처리, 구독 안내 발송(제3.4조 참고)',
            },
            {
              en: 'Matching Coffee Chat and Career Question requests with mentors and delivering their messages',
              ko: '커피챗·커리어 질문 신청을 멘토와 연결하고 메시지 전달',
            },
            {
              en: 'Sending the notifications you have turned on (for example new job postings, visa news, comments, and messages)',
              ko: '이용자가 켠 알림(예: 새 채용 공고, 비자 뉴스, 댓글, 메시지) 발송',
            },
            {
              en: 'Customer support, responding to inquiries, and communicating notices or policy changes',
              ko: '고객 지원, 문의 응대, 공지·정책 변경 안내',
            },
            {
              en: 'Detecting and responding to spam, fraud, harassment, and security threats, and enforcing the Terms',
              ko: '스팸·사기·괴롭힘·보안 위협 탐지 및 대응, 약관 집행',
            },
            {
              en: 'Improving Service quality, analyzing errors, and measuring usability and performance using first-party, aggregated usage counts',
              ko: '서비스 품질 개선, 오류 분석, 자체 집계 이용 통계를 통한 사용성·성능 측정',
            },
            {
              en: 'Complying with legal obligations, handling disputes, and protecting rights',
              ko: '법령상 의무 이행, 분쟁 대응, 권리 보호',
            },
            {
              en: 'Sending event, partnership, or marketing communications where you have consented',
              ko: '이용자가 동의한 경우 이벤트·제휴·마케팅 정보 전달',
            },
          ],
        },
      ],
    },
    {
      id: 'legal-basis',
      title: '7. Legal Bases (Where Applicable)',
      titleKo: '7. 처리의 근거(해당 시)',
      blocks: [
        {
          type: 'p',
          en: 'Depending on your place of residence (for example where GDPR/UK GDPR applies), we may process personal information under one or more of the following bases:',
          ko: '이용자 거주 지역에 따라(예: GDPR/UK GDPR이 적용되는 경우) 회사는 다음 중 하나 이상의 근거로 개인정보를 처리할 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Contract performance: providing the Services you request',
              ko: '계약 이행: 요청하신 서비스 제공',
            },
            {
              en: 'Legitimate interests: security, fraud prevention, Service improvement, and limited communications (where interests do not override your rights)',
              ko: '정당한 이익: 보안, 사기 방지, 서비스 개선, 제한적 커뮤니케이션(이익이 권리보다 우선하지 않는 범위)',
            },
            {
              en: 'Consent: optional marketing or other optional processing (withdrawable)',
              ko: '동의: 선택적 마케팅, 특정 선택적 처리(동의 철회 가능)',
            },
            {
              en: 'Legal obligation: retention, cooperation with investigations, accounting, and similar duties',
              ko: '법적 의무: 보존·수사 협조·회계 등',
            },
          ],
        },
        {
          type: 'p',
          en: 'For Users in the United States, this Policy’s notices and choices, together with applicable state privacy laws, generally apply.',
          ko: '미국 거주 이용자에게는 주로 본 방침에 따른 고지·선택권 및 주(州) 프라이버시법이 적용됩니다.',
        },
      ],
    },
    {
      id: 'sharing',
      title: '8. Sharing and Service Providers',
      titleKo: '8. 제3자 제공 및 처리위탁',
      blocks: [
        {
          type: 'p',
          en: 'We do not sell your personal information. We also do not intentionally operate “sharing” of personal information for cross-context behavioral advertising for monetary consideration. Information may still be transferred or accessed as follows to operate the Services:',
          ko: '회사는 이용자의 개인정보를 “판매(sell)”하지 않습니다. 또한 금전적 대가를 대가로 한 표적 광고 목적의 “공유(share)”를 의도적으로 운영하지 않도록 노력합니다. 다만 서비스 운영을 위해 아래와 같이 정보가 이전·접근될 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Service providers that process information on our behalf, only as needed to perform their work and under contractual protections (listed below)',
              ko: '회사를 대신해 정보를 처리하는 서비스 제공 업체 — 업무 수행에 필요한 범위에서, 계약상 보호조치 하에(아래 목록 참고)',
            },
            {
              en: 'AI translation provider: to translate posts, comments, and listings, the text of that Content (not your account details such as email address) is processed by an AI service provider, currently Anthropic, PBC (United States). We use settings under which this text is not used to train the provider’s models, and we do not send Content that we identify as containing private contact details for translation',
              ko: 'AI 번역 제공자: 게시물·댓글·매물을 번역하기 위해 해당 콘텐츠의 텍스트(이메일 주소 등 계정 정보는 제외)가 AI 서비스 제공자(현재 미국 Anthropic, PBC)에 의해 처리됩니다. 회사는 해당 텍스트가 제공자의 모델 학습에 사용되지 않는 설정을 사용하며, 개인 연락처가 포함된 것으로 확인된 게시물은 번역에 보내지 않습니다',
            },
            {
              en: 'Map, geocoding, and notification providers for the Marketplace: the 5-digit ZIP code of a listing’s trade area (without your account details) is sent to the OpenStreetMap Nominatim geocoding service, and on iOS may be sent to Apple’s geocoding service, to find the approximate center of that ZIP code; maps in the apps are displayed by your device’s map service; and inquiry notifications, which can include the listing title and a preview of the message, are delivered through Apple Push Notification service or Firebase Cloud Messaging (Google) (see Section 5)',
              ko: '중고거래의 지도·지오코딩·알림 제공자: ZIP 코드 지역의 대략적인 중심 좌표를 찾기 위해 등록 글의 거래 지역 5자리 ZIP 코드(계정 정보 제외)가 OpenStreetMap Nominatim 지오코딩 서비스로, iOS에서는 Apple의 지오코딩 서비스로 전송될 수 있습니다. 앱의 지도는 기기의 지도 서비스로 표시되며, 등록 글 제목과 메시지 미리보기가 포함될 수 있는 문의 알림은 Apple Push Notification service 또는 Firebase Cloud Messaging(Google)을 통해 전달됩니다(제5조 참고)',
            },
            {
              en: 'Partner brokerages and affiliated licensed real-estate professionals (which may include Fact Real Estate or another New York–licensed brokerage): when you inquire about, tour, apply for, or otherwise pursue a housing opportunity involving licensed brokerage activity, we may share information reasonably needed to provide that service—such as your name, email, phone number, preferred neighborhoods/budget/move-in timing, and related inquiry details—with the applicable brokerage and its licensees under their professional and confidentiality obligations',
              ko: '파트너 브로커리지 및 제휴 면허 부동산 전문가(Fact Real Estate 등 뉴욕주 면허 브로커리지 포함 가능): 면허 중개 활동이 수반되는 하우징 문의·투어·신청·진행 시, 해당 서비스 제공에 합리적으로 필요한 정보(이름, 이메일, 전화번호, 희망 지역·예산·입주 시기 및 관련 문의 내용 등)를 해당 브로커리지와 그 라이선스 소지자에게, 그들의 직무·비밀유지 의무하에 제공할 수 있습니다',
            },
            {
              en: 'Business transfers: information may transfer in a merger, acquisition, asset sale, or reorganization; we will provide notice where practicable',
              ko: '비즈니스 양도: 합병, 인수, 자산 양도, 구조조정 시 관련 정보가 이전될 수 있으며, 가능하면 고지합니다',
            },
            {
              en: 'Legal requirements: lawful requests from courts, law enforcement, or regulators, or where needed to protect rights and safety',
              ko: '법적 요구: 법원·수사기관·규제기관의 적법한 요청, 또는 권리·안전 보호를 위해 필요한 경우',
            },
            {
              en: 'Your direction or public settings: information you choose to post or share so that other Users or external parties can see it',
              ko: '이용자 지시·공개 설정: 이용자가 게시·공유를 선택하여 다른 이용자 또는 외부에 노출되는 경우',
            },
            {
              en: 'Consent-based: partnerships or events you separately agree to',
              ko: '동의 기반: 이용자가 별도 동의한 제휴·이벤트',
            },
          ],
        },
        {
          type: 'p',
          en: 'Service providers we currently use (name, location, what they do):',
          ko: '현재 이용하는 서비스 제공 업체(이름, 소재지, 처리 업무):',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Supabase, Inc. (United States): database, sign-in, and file storage (account, profile, posts, photos, verification documents). Kept for as long as described in Section 10.',
              ko: 'Supabase, Inc.(미국): 데이터베이스, 로그인, 파일 저장(계정, 프로필, 게시물, 사진, 인증 서류). 보관 기간은 제10조와 같습니다.',
            },
            {
              en: 'Amazon Web Services, Inc. (United States): servers that run the misaeng.com website and the shared Misaeng/Ellieo account service, including server logs.',
              ko: 'Amazon Web Services, Inc.(미국): misaeng.com 웹사이트와 미생·Ellieo 공용 계정 서비스를 운영하는 서버(서버 로그 포함).',
            },
            {
              en: 'Vercel Inc. (United States): hosting for our internal administration tools that staff use to review reports, verifications, and support requests.',
              ko: 'Vercel Inc.(미국): 신고·인증·문의 검토에 쓰는 내부 관리 도구의 호스팅.',
            },
            {
              en: 'Resend (Plus Five Five, Inc., United States): sending emails such as sign-up codes, verification codes, notices, and subscription reminders (email address and message content).',
              ko: 'Resend(Plus Five Five, Inc., 미국): 가입 코드, 인증 코드, 공지, 구독 안내 등 이메일 발송(이메일 주소와 메일 내용).',
            },
            {
              en: 'EmailJS (United States): delivering school-registration request forms to our team (the details you enter in that form).',
              ko: 'EmailJS(미국): 학교 등록 요청 양식을 회사 담당자에게 전달(양식에 입력한 내용).',
            },
            {
              en: 'Apple Inc. (United States): Sign in with Apple, Apple Push Notification service (device token and notification content), App Store purchases, and, on iOS, geocoding of a Marketplace ZIP code.',
              ko: 'Apple Inc.(미국): Apple로 로그인, Apple Push Notification service(기기 토큰과 알림 내용), App Store 결제, iOS의 중고거래 ZIP 코드 지오코딩.',
            },
            {
              en: 'Google LLC (United States): Google sign-in, Firebase Cloud Messaging for Android notifications (device token and notification content), and Google Maps Platform for place search and maps (search text and approximate locations, not your account details).',
              ko: 'Google LLC(미국): Google 로그인, Android 알림용 Firebase Cloud Messaging(기기 토큰과 알림 내용), 장소 검색·지도를 위한 Google Maps Platform(검색어와 대략적인 위치, 계정 정보 제외).',
            },
            {
              en: 'Stripe, Inc. (United States): web payments for Premium (see Section 3.4).',
              ko: 'Stripe, Inc.(미국): Premium 웹 결제(제3.4조 참고).',
            },
            {
              en: 'Anthropic, PBC (United States): AI translation and summaries of posts, listings, job postings, and visa news (Content text only, as described above).',
              ko: 'Anthropic, PBC(미국): 게시물·매물·채용 공고·비자 뉴스의 AI 번역·요약(위에 설명한 대로 콘텐츠 텍스트만).',
            },
            {
              en: 'OpenStreetMap Foundation (United Kingdom), Nominatim service: looking up the approximate center of a Marketplace ZIP code (the ZIP code only).',
              ko: 'OpenStreetMap Foundation(영국) Nominatim 서비스: 중고거래 ZIP 코드의 대략적인 중심 좌표 조회(ZIP 코드만).',
            },
            {
              en: 'CARTO (United States/Spain): map tiles on the website (your browser requests map images, which shares your IP address with CARTO).',
              ko: 'CARTO(미국/스페인): 웹사이트의 지도 이미지(브라우저가 지도 이미지를 요청하면서 IP 주소가 CARTO에 전달됨).',
            },
          ],
        },
        {
          type: 'note',
          en: 'Contact details, messenger IDs, or addresses you place in posts may be visible to other Users. Avoid posting unnecessary personal information.',
          ko: '게시판에 올린 연락처·메신저 ID·주소 등은 다른 이용자에게 보일 수 있습니다. 불필요한 개인정보 게시를 피하세요.',
        },
      ],
    },
    {
      id: 'cookies',
      title: '9. Cookies and Similar Technologies',
      titleKo: '9. 쿠키 및 유사 기술',
      blocks: [
        {
          type: 'p',
          en: 'We may use cookies, local storage, session storage, and similar technologies to operate the Services.',
          ko: '회사는 서비스 운영에 쿠키, 로컬 스토리지, 세션 스토리지 및 유사 기술을 사용할 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Essential: maintaining login state, security, and basic preferences',
              ko: '필수: 로그인 상태 유지, 보안, 기본 환경설정',
            },
            {
              en: 'Functional: remembering language/UI preferences and recent usage context',
              ko: '기능: 언어·UI 선호, 최근 이용 맥락 기억',
            },
            {
              en: 'Analytics: aggregated visit counts, page performance, and error rates when used for improvement',
              ko: '분석: 방문 수, 페이지 성과, 오류율 등 집계·개선 목적(사용되는 경우)',
            },
          ],
        },
        {
          type: 'p',
          en: 'You can refuse or delete cookies in your browser settings, but some features such as login may then be limited. Data stored in local storage (for example saves or temporary data) may be removed when you clear browser data.',
          ko: '브라우저 설정에서 쿠키를 거부·삭제할 수 있으나, 이 경우 로그인 등 일부 기능이 제한될 수 있습니다. 기기 내 로컬 스토리지에 저장되는 찜·임시 데이터 등은 브라우저 데이터를 삭제하면 함께 제거될 수 있습니다.',
        },
      ],
    },
    {
      id: 'retention',
      title: '10. Retention and Deletion',
      titleKo: '10. 보유 및 파기',
      blocks: [
        {
          type: 'p',
          en: 'We retain information for as long as needed to fulfill the purposes of collection, meet legal retention duties, and handle disputes or security matters, then delete or de-identify it using reasonable methods.',
          ko: '회사는 수집 목적 달성, 법령상 보존 의무, 분쟁·보안 대응에 필요한 기간 동안 정보를 보유한 뒤, 합리적인 방법으로 삭제·익명화합니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Account information: while your account is active. When you delete your account it is handled as described below',
              ko: '계정 정보: 계정이 유지되는 동안. 계정을 삭제하면 아래 “계정 삭제”에 따라 처리합니다',
            },
            {
              en: 'Posts and comments, and their translations: until User deletion or operational removal (translations are deleted with the original); backups, logs, and report records may follow different shorter or longer cycles',
              ko: '게시물·댓글 및 그 번역문: 이용자 삭제 또는 운영 삭제 시까지(번역문은 원문과 함께 삭제). 다만 백업·로그·신고 기록은 더 짧은/긴 주기로 별도 관리될 수 있음',
            },
            {
              en: 'Verification and security logs: for a reasonable period needed for abuse prevention and audit',
              ko: '인증·보안 로그: 부정이용 방지 및 감사에 필요한 합리적 기간',
            },
            {
              en: 'Workplace verification documents: deleted within 72 hours after the decision and no later than 7 days after upload; only the result is kept. Posts written while a workplace verification was under review and that stay private after a rejection are deleted 30 days after the rejection',
              ko: '직장 인증 서류: 결정 후 72시간 이내, 늦어도 업로드 후 7일 이내 삭제하며 결과만 보관합니다. 직장 인증 검토 중에 작성되어 거절 후에도 비공개로 남은 글은 거절일로부터 30일 후 삭제합니다',
            },
            {
              en: 'Parent account links: for as long as both accounts exist, and for a reasonable period afterward where needed for abuse prevention and reward records',
              ko: '학부모 계정 연결 정보: 두 계정이 유지되는 동안, 그리고 부정 방지·보상 기록에 필요한 경우 그 후 합리적인 기간',
            },
            {
              en: 'Inquiries and reports: for a period needed after handling for disputes and legal compliance',
              ko: '문의·신고: 처리 완료 후 분쟁·법령 대응에 필요한 기간',
            },
            {
              en: 'Misaeng Points records: for a period needed to operate the program and prevent abuse; your balance is deleted with your account',
              ko: '미생 포인트 기록: 프로그램 운영·부정 방지에 필요한 기간. 잔액은 계정과 함께 삭제됩니다',
            },
            {
              en: 'Premium and payment records: subscription and entitlement records while you have Premium, and payment, refund, and tax records for as long as tax and accounting laws require (generally up to 7 years), including after you delete your account',
              ko: 'Premium·결제 기록: 구독·이용 권한 기록은 Premium을 이용하는 동안, 결제·환불·세무 기록은 계정 삭제 후에도 세무·회계 법령이 요구하는 기간(일반적으로 최대 7년) 동안',
            },
            {
              en: 'Marketplace listings and inquiry conversations: listings (with their photos and translations) until you delete them or they are removed; inquiry conversations, including closed ones, for as long as needed to show them to their participants, handle reports and disputes, and prevent fraud (see Section 5); when you delete your account, both are deleted as described in Section 5',
              ko: '중고거래 등록 글 및 문의 대화: 등록 글(사진·번역문 포함)은 이용자가 삭제하거나 운영상 삭제될 때까지, 문의 대화(닫힌 대화 포함)는 참여자에게 보여 주고 신고·분쟁에 대응하며 사기를 방지하는 데 필요한 기간 동안(제5조 참고). 계정을 삭제하면 둘 다 제5조에 따라 삭제됩니다',
            },
            {
              en: 'Licensed real-estate transaction records: records related to New York–licensed brokerage activity (for example inquiry logs, agency/compensation disclosures, showing or application records retained in connection with a transaction) are generally kept for at least three (3) years, or longer if required by the New York Department of State, brokerage policy, or other applicable law',
              ko: '면허 부동산 거래 기록: 뉴욕주 면허 중개 활동과 관련된 기록(문의 로그, 대리·보수 공시, 쇼잉·신청 기록 등)은 일반적으로 최소 3년간, 또는 뉴욕주 Department of State·브로커리지 정책·기타 적용법이 더 긴 기간을 요구하면 그 기간 동안 보관합니다',
            },
          ],
        },
        {
          type: 'p',
          en: 'Account deletion. You can delete your account at any time in the app (Profile > Delete account) or on the website (My Page). When you do, we immediately clear your profile and delete your verification information and documents, push tokens and alert settings, notifications, saved posts, your mentor card, roommate/sublet posts, Marketplace listings (with their photos), and Marketplace conversations you are part of. Open Coffee Chats and pending Career Questions are canceled (points on hold are released). Your other posts and comments stay so that discussions remain readable, but they are shown as “Deleted user” without your name, photo, or badges. Web (Stripe) Premium subscriptions are canceled at the same time; App Store subscriptions are not canceled automatically, so cancel them first in iPhone Settings > Apple ID > Subscriptions. If you used Sign in with Apple, we revoke the connection with Apple. Your Misaeng account and the Ellieo account that shares it are deleted together. Copies in backups are overwritten within 30 days. We keep a minimal record that the account was deleted, the versions of the Terms and Privacy Policy you accepted, and records we must keep by law (such as payment and tax records).',
          ko: '계정 삭제. 앱(프로필 > 회원 탈퇴) 또는 웹사이트(마이페이지)에서 언제든 계정을 삭제할 수 있습니다. 삭제하면 프로필을 즉시 비우고, 인증 정보와 서류, 푸시 토큰과 알림 설정, 알림, 저장한 글, 멘토 카드, 룸메이트·서블렛 글, 중고거래 등록 글(사진 포함), 참여한 중고거래 대화를 삭제합니다. 진행 중인 커피챗과 답변 대기 중인 커리어 질문은 취소되며(보류된 포인트는 해제) 그 밖의 게시글과 댓글은 대화 흐름을 위해 남지만 이름·사진·배지 없이 “탈퇴한 회원”으로 표시됩니다. 웹(Stripe) Premium 구독은 함께 해지되며, App Store 구독은 자동으로 해지되지 않으므로 먼저 iPhone 설정 > Apple ID > 구독에서 해지해 주세요. Apple로 로그인을 사용했다면 Apple과의 연결을 해제합니다. 미생 계정과 같은 계정을 쓰는 Ellieo 계정도 함께 삭제됩니다. 백업 사본은 30일 이내에 덮어써집니다. 계정이 삭제되었다는 최소한의 기록, 동의한 이용약관·개인정보처리방침 버전, 결제·세무 기록 등 법령상 보관 의무가 있는 기록은 보관합니다.',
        },
        {
          type: 'p',
          en: 'Retention may be extended where law requires longer storage or litigation/investigation is pending.',
          ko: '법령이 더 긴 보존을 요구하거나 소송·수사가 진행 중인 경우 해당 기간 동안 보존이 연장될 수 있습니다.',
        },
      ],
    },
    {
      id: 'security',
      title: '11. Security',
      titleKo: '11. 안전조치',
      blocks: [
        {
          type: 'p',
          en: 'We take commercially reasonable administrative, technical, and physical safeguards to help protect personal information against loss, theft, unauthorized disclosure, alteration, or destruction—for example access minimization, HTTPS encryption in transit, authentication/session controls, and monitoring.',
          ko: '회사는 개인정보의 분실·도난·유출·변조·훼손을 막기 위해 상업적으로 합리적인 관리적·기술적·물리적 보호조치를 취합니다. 예: 접근 권한 최소화, 전송 구간 암호화(HTTPS), 인증·세션 관리, 모니터링 등.',
        },
        {
          type: 'p',
          en: 'No method of internet transmission or electronic storage is 100% secure. Please also protect your password, log out of shared devices, and watch for phishing.',
          ko: '그러나 인터넷을 통한 전송이나 전자적 저장 방식이 100% 안전할 수는 없습니다. 이용자도 비밀번호 관리, 공용 기기 로그아웃, 피싱 주의 등 기본 보안 수칙을 지켜 주세요.',
        },
      ],
    },
    {
      id: 'international',
      title: '12. International Transfers',
      titleKo: '12. 국외 이전',
      blocks: [
        {
          type: 'p',
          en: 'We operate primarily from the United States. Your information is transferred to, stored in, and processed in the United States and in the other countries of the service providers listed in Section 8. Where required by applicable law, we work to implement appropriate safeguards (such as contractual clauses). For example, Content sent for translation is processed by our AI translation provider in the United States (see Section 8).',
          ko: '회사는 미국을 중심으로 서비스를 운영하며, 이용자 정보는 미국 및 제8조에 기재된 서비스 제공 업체의 소재국으로 이전·저장·처리됩니다. 이 경우 회사는 적용 법령이 요구하는 범위에서 적절한 보호장치(계약 조항 등)를 마련하기 위해 노력합니다. 예를 들어 번역을 위해 보내는 게시물 텍스트는 미국에 있는 AI 번역 제공자가 처리합니다(제8조 참고).',
        },
        {
          type: 'note',
          en: 'Notice for users in the Republic of Korea. To provide the Services, the personal information described in Section 3 (account and profile, verification, posts and messages, Premium status, device and push tokens, and usage logs) is transferred over the network to, and stored in, the United States and the other countries of the service providers listed in Section 8, when you use the Services, for the purposes in Section 6, and kept for the periods in Section 10. You may refuse this transfer by not using the Services or by deleting your account; in that case you cannot use the Services. Contact: info@misaeng.com.',
          ko: '대한민국 이용자 안내(국외 이전). 회사는 서비스 제공을 위해 제3조의 개인정보(계정·프로필, 인증, 게시물·메시지, Premium 상태, 기기·푸시 토큰, 이용 기록)를 이용자가 서비스를 이용하는 시점에 네트워크를 통해 미국 및 제8조에 기재된 서비스 제공 업체(이전받는 자)의 소재국으로 이전·보관합니다. 이전 목적은 제6조, 보유 기간은 제10조와 같습니다. 국외 이전을 원하지 않으면 서비스를 이용하지 않거나 계정을 삭제할 수 있으나, 이 경우 서비스를 이용할 수 없습니다. 문의: info@misaeng.com',
        },
      ],
    },
    {
      id: 'children',
      title: '13. Age Requirement',
      titleKo: '13. 이용 연령',
      blocks: [
        {
          type: 'p',
          en: 'The Services are intended for adults aged 18 or older. We do not knowingly collect personal information from anyone under 18; if we learn that we have, we will delete it and close the account. Parent accounts are for adult parents or guardians. Parents or guardians may contact info@misaeng.com.',
          ko: '서비스는 만 18세 이상 성인을 대상으로 합니다. 회사는 만 18세 미만의 개인정보를 알면서 수집하지 않으며, 수집된 사실을 알게 되면 삭제하고 계정을 해지합니다. 학부모 계정은 성인인 부모 또는 보호자를 위한 계정입니다. 부모 또는 보호자는 info@misaeng.com 으로 연락해 주세요.',
        },
      ],
    },
    {
      id: 'rights',
      title: '14. Your Rights and Choices',
      titleKo: '14. 이용자의 권리와 선택',
      blocks: [
        {
          type: 'p',
          en: 'Depending on applicable law, you may have rights to:',
          ko: '적용 법령에 따라 이용자는 다음 권리를 가질 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Access or know personal information we hold about you',
              ko: '개인정보 열람·접근 요청',
            },
            {
              en: 'Correct inaccurate information',
              ko: '부정확한 정보의 정정',
            },
            {
              en: 'Request deletion — which may be limited where law requires retention',
              ko: '삭제(말소) 요청 — 법령상 보존이 필요한 경우 제한될 수 있음',
            },
            {
              en: 'Restrict or object to certain processing (where applicable)',
              ko: '처리 제한·반대(해당 법 적용 시)',
            },
            {
              en: 'Data portability (where applicable)',
              ko: '이동권(해당 법 적용 시)',
            },
            {
              en: 'Opt out of marketing communications',
              ko: '마케팅 수신 거부',
            },
            {
              en: 'Delete your account yourself in the app or on the website (see Section 10), or ask us to delete it',
              ko: '앱 또는 웹사이트에서 직접 계정 삭제(제10조 참고) 또는 회사에 삭제 요청',
            },
          ],
        },
        {
          type: 'p',
          en: 'Send requests to info@misaeng.com. We may ask for information reasonably needed to verify your identity and will aim to respond within timelines required by law. Agent requests may require proof of authorization.',
          ko: '요청은 info@misaeng.com 으로 보내 주세요. 회사는 요청자 본인 확인을 위해 합리적 정보를 요청할 수 있으며, 법령이 정한 기한 내에 응답하기 위해 노력합니다. 대리인 요청 시 위임 관계를 확인할 수 있습니다.',
        },
        {
          type: 'p',
          en: 'You may also exercise some choices directly through in-Service settings, editing/deleting posts, logging out, or clearing browser data.',
          ko: '서비스 내 설정·게시물 수정/삭제·로그아웃·브라우저 데이터 삭제로 일부 선택을 직접 행사할 수도 있습니다.',
        },
      ],
    },
    {
      id: 'ccpa',
      title: '15. U.S. State Privacy Notice (Including California)',
      titleKo: '15. 미국 주(州) 프라이버시 고지(캘리포니아 등)',
      blocks: [
        {
          type: 'p',
          en: 'Residents of California and certain other states may have rights to know, delete, correct, and opt out of sale/sharing under laws such as the CCPA/CPRA.',
          ko: 'California Consumer Privacy Act(CCPA/CPRA) 등 주법이 적용되는 거주자는 일정한 고지·삭제·정정·판매/공유 옵트아웃 권리를 가질 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Categories collected: identifiers (email, account ID); customer-record-like information; internet/electronic activity; approximate location; user-provided audiovisual/post content; and limited inferences for Service improvement/security — as further described in Sections 3 and 5',
              ko: '수집 범주: 식별자(이메일, 계정 ID), 고객 기록에 준하는 정보, 인터넷/전자 활동, 대략적 위치, 이용자가 제공한 시청각·게시 콘텐츠, 추론(제한적, 서비스 개선·보안 목적) 등 — 상세는 제3조 및 제5조와 같습니다.',
            },
            {
              en: 'Purposes of use: as described in Section 6',
              ko: '이용 목적: 제6조에 기재된 목적',
            },
            {
              en: 'Disclosure recipients: service providers and other parties described in Section 8',
              ko: '공개 대상: 제8조의 서비스 제공 업체·법적 요구 등',
            },
            {
              en: 'Sale: we do not sell personal information',
              ko: '판매: 회사는 개인정보를 판매하지 않습니다.',
            },
            {
              en: 'Sensitive personal information: we minimize intentional collection and do not use it beyond what is needed to provide the Services',
              ko: '민감 개인정보: 의도적 수집을 최소화하며, 서비스 제공에 필요한 범위를 넘은 목적으로 이용하지 않도록 합니다.',
            },
            {
              en: 'Non-discrimination: we will not unlawfully discriminate against you solely for exercising privacy rights',
              ko: '차별 금지: 권리 행사만을 이유로 한 불법적 차별을 하지 않습니다.',
            },
          ],
        },
        {
          type: 'p',
          en: 'To exercise rights or inquire about “Do Not Sell or Share My Personal Information,” contact info@misaeng.com.',
          ko: '권리 행사 및 “Do Not Sell or Share My Personal Information” 관련 문의: info@misaeng.com',
        },
      ],
    },
    {
      id: 'automated',
      title: '16. Automated Decision-Making',
      titleKo: '16. 자동화된 의사결정',
      blocks: [
        {
          type: 'p',
          en: 'We may use automated rules or tools for spam/abuse detection, ranking, and verifying posting permissions (such as verification status). We may also use AI tools to translate Content and to flag possible spam or personal information during translation; a person on our team makes the final decision on removing or restricting Content. We do not intend to make solely automated decisions that produce legal or similarly significant effects based only on profiling. You may raise concerns through our inquiry channels.',
          ko: '회사는 스팸·부정 이용 탐지, 추천·정렬, 작성 권한(인증 여부) 확인 등을 위해 자동화된 규칙·도구를 사용할 수 있습니다. 또한 게시물 번역과 번역 과정에서의 스팸·개인정보 의심 표시에 AI 도구를 사용할 수 있으며, 게시물 삭제·제한의 최종 판단은 회사 담당자가 합니다. 이것이 이용자에게 법적 또는 이와 유사하게 중대한 효과를 미치는 프로파일링만을 목적으로 하는 단독 자동결정은 의도하지 않습니다. 관련 이의는 문의 채널로 제기할 수 있습니다.',
        },
      ],
    },
    {
      id: 'breach',
      title: '17. Security Incidents',
      titleKo: '17. 유출 등 사고 대응',
      blocks: [
        {
          type: 'p',
          en: 'If a personal-information breach or similar incident is confirmed, we will notify Users and/or regulators as required by applicable law and take steps to mitigate harm and prevent recurrence.',
          ko: '개인정보 유출 등 사고가 확인되면 회사는 적용 법령이 요구하는 범위에서 이용자 및/또는 규제기관에 통지하고, 피해 최소화와 재발 방지를 위한 조치를 취합니다.',
        },
      ],
    },
    {
      id: 'changes',
      title: '18. Changes to This Policy',
      titleKo: '18. 방침의 변경',
      blocks: [
        {
          type: 'p',
          en: 'We may update this Policy as Services, laws, or operations change. When we do, we will revise the “Last updated” date above. For material changes, we ask existing Members to review and accept the updated Policy the next time they open the Services (in the app or on the website), and we may also notify you by email. For new Users, this Policy applies from when you accept it.',
          ko: '회사는 서비스·법령·운영 환경 변화에 따라 본 방침을 개정할 수 있습니다. 변경 시 상단의 “최종 업데이트” 일자를 수정합니다. 중요한 변경이 있으면 기존 회원이 다음에 서비스(앱 또는 웹사이트)를 열 때 개정 방침을 확인하고 동의하도록 안내하며, 이메일로도 알릴 수 있습니다. 신규 이용자에게는 동의한 시점부터 적용됩니다.',
        },
      ],
    },
    {
      id: 'contact',
      title: '19. Contact',
      titleKo: '19. 문의',
      blocks: [
        {
          type: 'p',
          en: 'For privacy questions, rights requests, or requests about information of someone under 18, contact:',
          ko: '개인정보 처리, 권리 행사, 만 18세 미만 정보 관련 요청 등은 아래로 연락해 주세요.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Misaeng LLC',
              ko: 'Misaeng LLC',
            },
            {
              en: '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
              ko: '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
            },
            {
              en: 'Email: info@misaeng.com',
              ko: '이메일: info@misaeng.com',
            },
          ],
        },
        {
          type: 'note',
          en: 'This document is provided for general notice purposes and is not legal advice for individual situations. Actual practices may change with product updates; please check this page for material changes.',
          ko: '본 문서는 일반적인 고지 목적으로 제공되며, 개별 상황에 대한 법률 자문이 아닙니다. 회사의 실제 처리 관행이 기능 업데이트에 따라 세부적으로 달라질 수 있으므로, 중요 변경은 본 페이지를 통해 확인하시기 바랍니다.',
        },
      ],
    },
  ],
}
