import type { LegalDocument } from '@lib/constants/legalDocument'

/** Misaeng NYC Privacy Policy — English controls; Korean is a convenience translation */
export const NYC_PRIVACY_POLICY: LegalDocument = {
  eyebrow: 'LEGAL',
  title: 'Privacy Policy',
  titleKo: '개인정보처리방침',
  lastUpdated: 'August 30, 2026',
  lastUpdatedKo: '2026년 8월 30일',
  effectiveDate: 'August 30, 2026',
  effectiveDateKo: '2026년 8월 30일',
  contactEmail: 'info@misaeng.com',
  companyName: 'Misaeng LLC',
  companyAddress:
    '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
  languageNotice: {
    en: 'The English version of this Privacy Policy is the official and controlling version. The Korean text is provided for convenience only. If there is any conflict or inconsistency between the English and Korean versions, the English version prevails.',
    ko: '본 개인정보처리방침의 영문본이 공식·기준 문서입니다. 한글은 참고용 번역이며, 영문과 한글에 차이·불일치가 있을 경우 영문본이 우선합니다.',
  },
  intro: [
    {
      en: 'Misaeng LLC (“Company,” “we,” “us,” or “Misaeng”) provides this Privacy Policy (the “Policy”) to explain how we collect, use, store, and share personal information in connection with the Misaeng NYC website and related services (the “Services”).',
      ko: 'Misaeng LLC(이하 “회사”, “당사”, “Misaeng”)는 Misaeng NYC 웹사이트 및 관련 서비스(이하 “서비스”)를 제공하면서 이용자의 개인정보를 소중히 다루기 위해 본 개인정보처리방침(이하 “본 방침”)을 공개합니다.',
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
          en: 'This Policy applies to Misaeng NYC and directly connected pages and features operated by the Company, including Community Boards, Housing, login, My Page, credits, inquiries, and partner information pages.',
          ko: '본 방침은 회사가 운영하는 Misaeng NYC 및 이와 직접 연결된 페이지·기능(커뮤니티 게시판, 하우징, 로그인, 마이페이지, 크레딧, 문의, 파트너 안내 등)에 적용됩니다.',
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
              en: 'Account and profile: email address, display name/nickname, profile photo, bio, and preference settings',
              ko: '계정·프로필: 이메일 주소, 표시 이름/닉네임, 프로필 사진, 자기소개, 선호 설정',
            },
            {
              en: 'Verification-related: school (or recognized institution) email, verification status, school name/identifier, and confirmation details submitted during verification',
              ko: '인증 관련: 학교(또는 인정 기관) 이메일, 인증 상태, 소속 학교명·식별자, 인증 과정에서 제출하는 확인 정보',
            },
            {
              en: 'Posts and communications: post titles, body text, images/attachments, comments, report reasons and details, inquiry messages, and feedback',
              ko: '게시·소통: 게시글 제목·본문·이미지·첨부, 댓글, 신고 사유·내용, 문의 메시지, 피드백',
            },
            {
              en: 'Listing/recruitment details you choose to include: roommate/sublet conditions, contact methods you voluntarily disclose, preferred areas, budget, and similar',
              ko: '거래·모집 관련 기재 정보: 룸메이트/서블렛 조건, 연락 방법(이용자가 자발적으로 공개한 경우), 희망 지역·예산 등',
            },
            {
              en: 'Credit and reward applications: application details, contact information, and scheduling information as needed',
              ko: '크레딧·보상 신청: 신청 내용, 연락용 정보, 일정 조율에 필요한 정보',
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
              en: 'Cookies and similar technologies: cookies, local storage, pixels, and similar tools used for login persistence, preferences, security, and traffic analysis',
              ko: '쿠키 및 유사 기술: 로그인 유지, 선호 설정, 보안, 트래픽 분석에 사용되는 쿠키·로컬 스토리지·픽셀 등',
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
              en: 'From social/OAuth login providers (for example Google): identifiers, email, and basic profile information within the scope you authorize',
              ko: '소셜/OAuth 로그인 제공자(예: Google)로부터 이용자가 허용한 범위의 식별자·이메일·프로필 기본 정보',
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
      ],
    },
    {
      id: 'purpose',
      title: '5. How We Use Information',
      titleKo: '5. 이용 목적',
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
              en: 'Managing School Email Verification and posting permissions',
              ko: '학교 이메일 인증 및 작성 권한 관리',
            },
            {
              en: 'Supporting Housing and roommate browsing/submission features',
              ko: '하우징·룸메이트 등 정보 열람·등록 지원',
            },
            {
              en: 'Calculating Community Credits, preventing fraudulent earning, and processing reward applications',
              ko: '커뮤니티 크레딧 산정·부정 적립 방지·보상 신청 처리',
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
              en: 'Improving Service quality, analyzing errors, and measuring usability and performance within a reasonable scope',
              ko: '서비스 품질 개선, 오류 분석, 사용성·성능 측정(합리적 범위의 분석)',
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
      title: '6. Legal Bases (Where Applicable)',
      titleKo: '6. 처리의 근거(해당 시)',
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
      title: '7. Sharing and Service Providers',
      titleKo: '7. 제3자 제공 및 처리위탁',
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
              en: 'Service providers (hosting, databases, email delivery, customer support, security/monitoring, analytics, maps/place APIs, login providers, and similar) — only as needed to perform their work and under contractual protections',
              ko: '서비스 제공 업체(호스팅, 데이터베이스, 이메일 발송, 고객지원, 보안·모니터링, 분석, 지도/장소 API, 로그인 제공자 등) — 업무 수행에 필요한 범위, 계약상 보호조치 하에',
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
          type: 'note',
          en: 'Contact details, messenger IDs, or addresses you place in posts may be visible to other Users. Avoid posting unnecessary personal information.',
          ko: '게시판에 올린 연락처·메신저 ID·주소 등은 다른 이용자에게 보일 수 있습니다. 불필요한 개인정보 게시를 피하세요.',
        },
      ],
    },
    {
      id: 'cookies',
      title: '8. Cookies and Similar Technologies',
      titleKo: '8. 쿠키 및 유사 기술',
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
      title: '9. Retention and Deletion',
      titleKo: '9. 보유 및 파기',
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
              en: 'Account information: while the account is active and for a reasonable period after a deletion request',
              ko: '계정 정보: 계정 유지 기간 및 삭제 요청 후 처리에 필요한 기간',
            },
            {
              en: 'Posts and comments: until User deletion or operational removal; backups, logs, and report records may follow different shorter or longer cycles',
              ko: '게시물·댓글: 이용자 삭제 또는 운영 삭제 시까지. 다만 백업·로그·신고 기록은 더 짧은/긴 주기로 별도 관리될 수 있음',
            },
            {
              en: 'Verification and security logs: for a reasonable period needed for abuse prevention and audit',
              ko: '인증·보안 로그: 부정이용 방지 및 감사에 필요한 합리적 기간',
            },
            {
              en: 'Inquiries and reports: for a period needed after handling for disputes and legal compliance',
              ko: '문의·신고: 처리 완료 후 분쟁·법령 대응에 필요한 기간',
            },
            {
              en: 'Credit and reward records: for a period needed to operate the program and prevent abuse',
              ko: '크레딧·보상 관련 기록: 프로그램 운영·부정 방지에 필요한 기간',
            },
            {
              en: 'Licensed real-estate transaction records: records related to New York–licensed brokerage activity (for example inquiry logs, agency/compensation disclosures, showing or application records retained in connection with a transaction) are generally kept for at least three (3) years, or longer if required by the New York Department of State, brokerage policy, or other applicable law',
              ko: '면허 부동산 거래 기록: 뉴욕주 면허 중개 활동과 관련된 기록(문의 로그, 대리·보수 공시, 쇼잉·신청 기록 등)은 일반적으로 최소 3년간, 또는 뉴욕주 Department of State·브로커리지 정책·기타 적용법이 더 긴 기간을 요구하면 그 기간 동안 보관합니다',
            },
          ],
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
      title: '10. Security',
      titleKo: '10. 안전조치',
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
      title: '11. International Transfers',
      titleKo: '11. 국외 이전',
      blocks: [
        {
          type: 'p',
          en: 'We operate primarily from the United States. Depending on cloud and vendor infrastructure, your information may be transferred to, stored in, or processed in countries other than your country of residence. Where required by applicable law, we work to implement appropriate safeguards (such as contractual clauses).',
          ko: '회사는 미국을 중심으로 서비스를 운영하며, 클라우드·벤더 인프라의 위치에 따라 이용자 정보가 이용자 거주국 외로 이전·저장·처리될 수 있습니다. 이 경우 회사는 적용 법령이 요구하는 범위에서 적절한 보호장치(계약 조항 등)를 마련하기 위해 노력합니다.',
        },
      ],
    },
    {
      id: 'children',
      title: '12. Children’s Privacy',
      titleKo: '12. 아동의 개인정보',
      blocks: [
        {
          type: 'p',
          en: 'The Services are not directed to children under 13 (or under a higher age if required by your local law), and we do not knowingly collect their personal information. If we learn that such information was collected, we will take reasonable steps to delete it. Guardians may contact info@misaeng.com.',
          ko: '서비스는 만 13세 미만(또는 거주지 법령상 더 높은 연령 기준이 적용되는 경우 그 연령 미만)의 아동을 대상으로 하지 않으며, 그러한 아동의 개인정보를 고의로 수집하지 않습니다. 해당 정보가 수집된 사실을 인지하면 삭제하기 위해 합리적인 조치를 취합니다. 보호자는 info@misaeng.com 으로 연락해 주세요.',
        },
      ],
    },
    {
      id: 'rights',
      title: '13. Your Rights and Choices',
      titleKo: '13. 이용자의 권리와 선택',
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
              en: 'Request account deletion',
              ko: '계정 삭제 요청',
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
      title: '14. U.S. State Privacy Notice (Including California)',
      titleKo: '14. 미국 주(州) 프라이버시 고지(캘리포니아 등)',
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
              en: 'Categories collected: identifiers (email, account ID); customer-record-like information; internet/electronic activity; approximate location; user-provided audiovisual/post content; and limited inferences for Service improvement/security — as further described in Section 3',
              ko: '수집 범주: 식별자(이메일, 계정 ID), 고객 기록에 준하는 정보, 인터넷/전자 활동, 대략적 위치, 이용자가 제공한 시청각·게시 콘텐츠, 추론(제한적, 서비스 개선·보안 목적) 등 — 상세는 제3조와 같습니다.',
            },
            {
              en: 'Purposes of use: as described in Section 5',
              ko: '이용 목적: 제5조에 기재된 목적',
            },
            {
              en: 'Disclosure recipients: service providers and other parties described in Section 7',
              ko: '공개 대상: 제7조의 서비스 제공 업체·법적 요구 등',
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
      title: '15. Automated Decision-Making',
      titleKo: '15. 자동화된 의사결정',
      blocks: [
        {
          type: 'p',
          en: 'We may use automated rules or tools for spam/abuse detection, ranking, and verifying posting permissions (such as verification status). We do not intend to make solely automated decisions that produce legal or similarly significant effects based only on profiling. You may raise concerns through our inquiry channels.',
          ko: '회사는 스팸·부정 이용 탐지, 추천·정렬, 작성 권한(인증 여부) 확인 등을 위해 자동화된 규칙·도구를 사용할 수 있습니다. 이것이 이용자에게 법적 또는 이와 유사하게 중대한 효과를 미치는 프로파일링만을 목적으로 하는 단독 자동결정은 의도하지 않습니다. 관련 이의는 문의 채널로 제기할 수 있습니다.',
        },
      ],
    },
    {
      id: 'breach',
      title: '16. Security Incidents',
      titleKo: '16. 유출 등 사고 대응',
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
      title: '17. Changes to This Policy',
      titleKo: '17. 방침의 변경',
      blocks: [
        {
          type: 'p',
          en: 'We may update this Policy as Services, laws, or operations change. When we do, we will revise the “Last updated” date above and, for material changes, provide notice through the Services, email, or other reasonable means. Continued use after the effective date may be treated as acceptance of the updated Policy.',
          ko: '회사는 서비스·법령·운영 환경 변화에 따라 본 방침을 개정할 수 있습니다. 변경 시 상단의 “최종 업데이트” 일자를 수정하고, 중요한 변경은 서비스 내 공지 또는 이메일 등 합리적인 방법으로 안내합니다. 변경 효력 발생 이후 서비스를 계속 이용하면 개정 방침에 동의한 것으로 볼 수 있습니다.',
        },
      ],
    },
    {
      id: 'contact',
      title: '18. Contact',
      titleKo: '18. 문의',
      blocks: [
        {
          type: 'p',
          en: 'For privacy questions, rights requests, or children’s information deletion requests, contact:',
          ko: '개인정보 처리, 권리 행사, 아동 정보 삭제 요청 등은 아래로 연락해 주세요.',
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
