import type { LegalDocument } from '@lib/constants/legalDocument'

/** Misaeng NYC Terms of Use — English controls; Korean is a convenience translation */
export const NYC_TERMS_OF_USE: LegalDocument = {
  eyebrow: 'LEGAL',
  title: 'Terms of Use',
  titleKo: '이용약관',
  version: '2026-08-30',
  lastUpdated: 'August 30, 2026',
  lastUpdatedKo: '2026년 8월 30일',
  effectiveDate: 'August 30, 2026',
  effectiveDateKo: '2026년 8월 30일',
  contactEmail: 'info@misaeng.com',
  companyName: 'Misaeng LLC',
  companyAddress:
    '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
  languageNotice: {
    en: 'The English version of these Terms is the official and controlling version. The Korean text is provided for convenience only. If there is any conflict or inconsistency between the English and Korean versions, the English version prevails.',
    ko: '본 약관의 영문본이 공식·기준 문서입니다. 한글은 참고용 번역이며, 영문과 한글에 차이·불일치가 있을 경우 영문본이 우선합니다.',
  },
  intro: [
    {
      en: 'These Terms of Use (the “Terms”) govern your access to and use of the websites and related online services operated by Misaeng LLC (“Company,” “we,” “us,” or “Misaeng”), including the New York City community platform for international students and professionals known as “Misaeng NYC” (collectively, the “Services”).',
      ko: '본 이용약관(이하 “본 약관”)은 Misaeng LLC(이하 “회사”, “당사”, “Misaeng”)가 운영하는 웹사이트 및 관련 온라인 서비스, 특히 New York City 지역 유학생·직장인을 위한 커뮤니티 플랫폼 “Misaeng NYC”(이하 통칭 “서비스”)의 이용 조건과 회사와 이용자 간의 권리·의무를 정합니다.',
    },
    {
      en: 'By accessing, browsing, registering for, posting on, commenting on, contacting us through, applying for credits in connection with, or otherwise using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, do not use the Services.',
      ko: '서비스에 접속·열람·가입·게시·댓글·문의·크레딧 신청 등 일체의 이용 행위를 하는 경우, 이용자는 본 약관을 읽고 이해하였으며 이에 동의한 것으로 간주됩니다. 동의하지 않는 경우 서비스를 이용하지 마십시오.',
    },
  ],
  sections: [
    {
      id: 'definitions',
      title: '1. Definitions',
      titleKo: '1. 정의',
      blocks: [
        {
          type: 'p',
          en: 'For purposes of these Terms, the following definitions apply. Capitalized terms not defined here have the meanings given elsewhere in these Terms, applicable law, customary industry usage, or on-Service notices.',
          ko: '본 약관에서 사용하는 용어의 정의는 다음과 같습니다. 정의되지 않은 용어는 관련 법령, 상관례 및 서비스 화면의 안내에 따릅니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: '“User” means any individual who accesses or uses the Services under these Terms.',
              ko: '“이용자”란 본 약관에 따라 서비스에 접속하거나 이용하는 모든 개인을 말합니다.',
            },
            {
              en: '“Member” means a User who creates an account under the Company’s procedures and uses member features of the Services.',
              ko: '“회원”이란 회사가 정한 절차에 따라 계정을 생성하고 서비스의 회원 기능을 이용하는 이용자를 말합니다.',
            },
            {
              en: '“Content” means any posts, comments, images, videos, links, profile information, reports, or other materials that a User uploads, creates, or transmits through the Services.',
              ko: '“게시물”이란 이용자가 서비스에 업로드·작성·전송하는 글, 댓글, 이미지, 영상, 링크, 프로필 정보, 신고 내용 등 일체의 콘텐츠를 말합니다.',
            },
            {
              en: '“Community Boards” means posting and discussion spaces provided by the Company, such as events, food, roommate/sublet, OPT/visa/green-card topics, job reviews, and the anonymous board.',
              ko: '“커뮤니티 게시판”이란 이벤트, 맛집, 룸메이트·서블렛, OPT·비자·영주권, 취업 후기, 익명게시판 등 회사가 제공하는 게시·토론 공간을 말합니다.',
            },
            {
              en: '“Housing” means rental or residential information and listings posted by the Company or Users on the Services.',
              ko: '“하우징”이란 회사가 또는 이용자가 서비스에 게시하는 임대·주거 관련 정보·매물 안내를 말합니다.',
            },
            {
              en: '“Anonymous Board” means a board where a poster’s nickname, school, and profile photo are generally hidden or masked from other Users. This does not guarantee absolute anonymity for operational or legal purposes.',
              ko: '“익명게시판”이란 다른 이용자에게 작성자의 닉네임·학교·프로필 사진 등이 기본적으로 노출되지 않도록 표시되는 게시판을 말합니다. 이는 운영·법령상 완전한 익명성을 보장한다는 의미가 아닙니다.',
            },
            {
              en: '“School Email Verification” means a school (or recognized institution) email-based verification process that the Company may require for certain features (such as posting or commenting).',
              ko: '“학교 이메일 인증”이란 특정 기능(글·댓글 작성 등)을 이용하기 위해 회사가 요청할 수 있는 학교(또는 인정 기관) 이메일 기반 확인 절차를 말합니다.',
            },
            {
              en: '“Community Credits” means in-Service reward units that the Company may award, deduct, or expire under its policies. Credits are not cash, securities, or redeemable monetary assets.',
              ko: '“커뮤니티 크레딧”이란 회사가 정책에 따라 적립·차감·소멸시킬 수 있는 서비스 내 보상 단위로, 현금·유가증권·환금성 자산이 아닙니다.',
            },
            {
              en: '“Third-Party Services” means services or infrastructure provided by parties other than the Company, such as Google sign-in, maps/place search, email, hosting, and analytics tools.',
              ko: '“제3자 서비스”란 Google 로그인, 지도·장소 검색, 이메일, 호스팅, 분석 도구 등 회사 외 사업자가 제공하는 서비스·인프라를 말합니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      titleKo: '2. 서비스 대상 및 자격',
      blocks: [
        {
          type: 'p',
          en: 'The Services are primarily intended for Users living, studying, or working in New York City and nearby areas. Unless restricted by law or technical controls, access by Users in other regions is not categorically prohibited.',
          ko: '서비스는 주로 New York City 및 인근 지역에서 생활·유학·근무하는 이용자를 위한 정보 공유·커뮤니티 플랫폼입니다. 다만 지역 제한이 법령상 또는 기술적으로 강제되지 않는 한, 다른 지역 이용자의 접속을 일률적으로 금지하지는 않습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'You must be of legal age to form a binding contract under the laws of your place of residence (generally 18 years or older). Minors may not register or use posting features without the consent of a legal guardian where required.',
              ko: '이용자는 자신이 거주하는 국가·주의 법령상 계약을 체결할 수 있는 법정 연령(일반적으로 만 18세 이상)이어야 합니다. 미성년자는 법정대리인의 동의 없이 회원 가입 및 게시 기능을 이용할 수 없습니다.',
            },
            {
              en: 'The Company may impose reasonable requirements for certain features, including School Email Verification, identity or affiliation checks, and operational review.',
              ko: '회사는 학교 이메일 인증, 신원·소속 확인, 운영상 심사 등 합리적 요건을 특정 기능에 부과할 수 있습니다.',
            },
            {
              en: 'The Company may refuse registration or restrict use where fraud, spam, repeated violations, or unlawful conduct is confirmed or reasonably suspected.',
              ko: '회사는 사기·스팸·반복 약관 위반·법령 위반이 확인되거나 합리적 의심이 있는 경우 가입을 거부하거나 이용을 제한할 수 있습니다.',
            },
            {
              en: 'You may not create or operate multiple accounts to evade policies, rewards, reporting, or restrictions.',
              ko: '이용자는 한 사람이 부당하게 다수의 계정을 생성·운영하여 정책·보상·신고·제한을 우회해서는 안 됩니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'account',
      title: '3. Accounts, Verification, and Security',
      titleKo: '3. 계정, 인증 및 보안',
      blocks: [
        {
          type: 'p',
          en: 'Some features (including posting, commenting, saves/likes, My Page, and credits) may require Member login and/or additional verification.',
          ko: '일부 기능(글 작성, 댓글, 찜, 마이페이지, 크레딧 등)은 회원 로그인 및/또는 추가 인증이 필요할 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Members must provide accurate and up-to-date information during registration and profile setup, and must not use false or stolen information.',
              ko: '회원은 가입·프로필 작성 시 정확하고 최신의 정보를 제공해야 하며, 허위·도용 정보 사용을 금지합니다.',
            },
            {
              en: 'Where School Email Verification is required, Members are responsible for the accuracy of affiliation and email information used for verification. Misrepresenting verification status or using another person’s email without authorization is prohibited.',
              ko: '학교 이메일 인증이 요구되는 기능에서는, 인증에 사용된 소속·이메일 정보의 정확성에 대한 책임이 회원에게 있습니다. 인증 상태를 허위로 표시하거나 타인의 이메일을 무단 사용하는 행위는 금지됩니다.',
            },
            {
              en: 'Members are responsible for safeguarding login credentials (passwords, OAuth tokens, device sessions, and similar). Do not share credentials or leave sessions open on shared devices.',
              ko: '계정 로그인 수단(비밀번호, OAuth 토큰, 기기 세션 등)의 관리 책임은 회원에게 있습니다. 제3자 공유, 공개 기기에서의 방치, 피싱에 의한 유출에 유의하십시오.',
            },
            {
              en: 'Activity occurring under an account may be treated as that Member’s activity. If you suspect unauthorized use, notify the Company promptly and update credentials.',
              ko: '계정에서 발생한 이용 행위는 원칙적으로 해당 회원의 행위로 간주될 수 있습니다. 무단 사용이 의심되면 즉시 회사에 알리고 비밀번호·연동을 변경하십시오.',
            },
            {
              en: 'For security, operations, and legal compliance, the Company may suspend accounts, request re-verification, expire sessions, or limit features.',
              ko: '회사는 보안·운영·법령 준수를 위해 계정 정지, 재인증 요청, 세션 만료, 기능 제한을 할 수 있습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'services',
      title: '4. Description of the Services',
      titleKo: '4. 서비스의 내용',
      blocks: [
        {
          type: 'p',
          en: 'The Company may change, suspend, or add features of the Services. In urgent cases (security, outages, or legal requirements), notice may be provided after the change. Current or planned features may include:',
          ko: '회사는 서비스의 구성·명칭·기능을 변경·중단·추가할 수 있으며, 사전 고지가 어려운 긴급 사유(보안, 장애, 법령)가 있는 경우 사후 안내할 수 있습니다. 현재 제공·예정되는 주요 기능의 예시는 다음과 같습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Community Boards: posting, comments, reactions, and reports on food, events, roommate/sublet, OPT/visa/green-card (including CPT/OPT), job reviews, the anonymous board, and similar spaces',
              ko: '커뮤니티 게시판: 맛집, 이벤트, 룸메이트·서블렛, OPT·비자·영주권(CPT/OPT 포함), 취업 후기, 익명게시판 등에서의 게시·댓글·반응·신고',
            },
            {
              en: 'Housing: browsing and, where available, submitting or inquiring about residential listings',
              ko: '하우징: 주거·매물 관련 정보 열람 및 (해당 시) 등록·문의',
            },
            {
              en: 'My Page: your posts, saves, and profile/settings features',
              ko: '마이페이지: 내 글, 찜, 프로필·설정 관련 기능',
            },
            {
              en: 'Community Credits: earning credits through activity and applying for rewards under Company policies',
              ko: '커뮤니티 크레딧: 활동에 따른 적립 및 회사가 정한 보상·신청 절차',
            },
            {
              en: 'Informational pages such as partners, influencers, and professional services',
              ko: '파트너·인플루언서·전문 서비스 안내 등 정보성 페이지',
            },
            {
              en: 'Customer inquiries via email, contact forms, social channels, and similar',
              ko: '고객 문의(이메일, 문의 페이지, 소셜 채널 등)',
            },
          ],
        },
        {
          type: 'note',
          en: 'Some boards or features may be marked “coming soon,” beta, or limited release, and availability or completeness is not guaranteed.',
          ko: '일부 게시판·기능은 “준비 중”, 베타 또는 제한 공개 상태일 수 있으며, 가용성·완성도를 보장하지 않습니다.',
        },
      ],
    },
    {
      id: 'user-content',
      title: '5. User Content and License',
      titleKo: '5. 이용자 콘텐츠 및 라이선스',
      blocks: [
        {
          type: 'p',
          en: 'You must own or have all rights, licenses, and consents needed for Content you post. Do not post Content that infringes another person’s copyright, trademark, publicity, privacy, or trade-secret rights.',
          ko: '이용자는 자신이 게시하는 콘텐츠에 대한 적법한 권리를 보유하거나, 필요한 라이선스·동의를 확보해야 합니다. 타인의 저작권·상표권·초상권·개인정보·영업비밀을 침해하는 게시물을 올려서는 안 됩니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Subject to these Terms, you retain ownership of your Content. You grant the Company a worldwide, non-exclusive, royalty-free, transferable, and sublicensable license to use, reproduce, modify, distribute, publicly display, and perform your Content as needed to operate, improve, secure, promote, archive, and legally defend the Services.',
              ko: '게시물의 소유권은 원칙적으로 작성 이용자에게 귀속됩니다. 다만 이용자는 회사에 대해, 서비스 운영·개선·보안·홍보·아카이빙·법령 대응에 필요한 범위에서 전 세계적·비독점적·무상·양도 가능한(하위 라이선스 가능) 사용·복제·수정·배포·공중송신·표시 권한을 부여합니다.',
            },
            {
              en: 'You represent that your Content complies with these Terms, community guidelines, and applicable law.',
              ko: '이용자는 게시물이 본 약관·커뮤니티 가이드라인·법령에 위반되지 않음을 보증합니다.',
            },
            {
              en: 'The Company may review, hide, remove, relocate, or reformat Content, or adjust ranking, for quality, safety, and legal compliance. This does not create an obligation to pre-screen all Content.',
              ko: '회사는 서비스 품질·안전·법령 준수를 위해 게시물을 검토·비공개·삭제·이동·편집(형식 보정 등)하거나 노출 순서를 조정할 수 있습니다. 이는 모든 콘텐츠를 사전 검열할 의무를 의미하지 않습니다.',
            },
            {
              en: 'Even after account or Content deletion, copies may remain for a period in backups, logs, legal retention, or materials already shared or quoted by others, or where immediate technical removal is not feasible.',
              ko: '이용자가 계정을 삭제하거나 게시물을 삭제하더라도, 백업·로그·법적 보존·다른 이용자에게 이미 공유·인용된 사본, 또는 기술적으로 즉시 제거가 어려운 사본이 일정 기간 남을 수 있습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'community-rules',
      title: '6. Community Rules and Prohibited Conduct',
      titleKo: '6. 커뮤니티 이용 규칙 및 금지행위',
      blocks: [
        {
          type: 'p',
          en: 'The Services depend on mutual respect and safe information sharing. You must not engage in the following. Violations may result in Content removal, feature limits, account suspension or termination, and referral to authorities.',
          ko: '서비스는 상호 존중과 안전한 정보 공유를 전제로 합니다. 이용자는 다음 행위를 해서는 안 됩니다. 위반 시 게시물 삭제, 기능 제한, 계정 정지·해지, 수사기관 신고 등 조치가 취해질 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Posting information that can identify another person without authorization (real name, contact details, address, school, workplace, photos, account handles, and similar), or defaming, insulting, or harassing someone by naming or implying them',
              ko: '실명·연락처·주소·학교·직장·사진·계정 핸들 등으로 타인을 특정할 수 있는 정보 무단 게시, 또는 특정인을 지칭·암시하는 비방·모욕·괴롭힘',
            },
            {
              en: 'Hate, discrimination, threats, stalking, sexual exploitation, or content harmful to minors',
              ko: '혐오·차별·위협·스토킹·성적 착취·미성년자 대상 유해 콘텐츠',
            },
            {
              en: 'Spreading false statements, impersonation, fraud, phishing, or scam-oriented deal solicitation',
              ko: '허위 사실 유포, 사칭, 사기, 피싱, 스캠성 거래 유도',
            },
            {
              en: 'Posts or deals involving illegal drugs, weapons, forged documents, unlawful employment or visa brokerage, or other unlawful purposes',
              ko: '불법 약물, 무기, 위조 서류, 불법 취업·비자 알선 등 법령 위반 목적의 게시·거래',
            },
            {
              en: 'Spam, unauthorized advertising or promotion (including bulk commercial posts without prior Company consent), macros, bots, or scraping',
              ko: '스팸, 무단 광고·홍보(회사 사전 동의 없는 영리 목적 대량 게시 포함), 매크로·봇·스크래핑',
            },
            {
              en: 'Unauthorized access to the Services, accounts, or security systems; exploiting vulnerabilities; reverse engineering beyond what law permits; or denial-of-service attacks',
              ko: '서비스·계정·보안 체계에 대한 무단 접근, 취약점 악용, 리버스 엔지니어링(법령이 허용하는 범위를 넘는 경우), DDoS 등',
            },
            {
              en: 'Collecting, storing, or disclosing another person’s personal or sensitive information without consent',
              ko: '타인의 개인정보·민감정보를 동의 없이 수집·저장·공개',
            },
            {
              en: 'Abusing reporting, blocking, verification, or credit systems',
              ko: '신고·차단·인증·크레딧 제도를 악의적으로 남용하는 행위',
            },
            {
              en: 'Posting Content that infringes the intellectual property of the Company or any third party',
              ko: '회사 또는 제3자의 지식재산권을 침해하는 콘텐츠 게시',
            },
            {
              en: 'Any other conduct that violates applicable law, these Terms, or on-Service guidelines',
              ko: '기타 관련 법령, 본 약관, 화면상 가이드라인에 위배되는 행위',
            },
          ],
        },
        {
          type: 'p',
          en: 'Community writing guidelines shown on compose screens may supplement these Terms as operating policies.',
          ko: '글쓰기 화면 등에 표시되는 커뮤니티 작성 안내는 본 약관의 일부를 보완하는 운영 정책으로 적용될 수 있습니다.',
        },
      ],
    },
    {
      id: 'anonymous',
      title: '7. Special Notice for the Anonymous Board',
      titleKo: '7. 익명게시판에 관한 특별 고지',
      blocks: [
        {
          type: 'p',
          en: 'On the Anonymous Board, display name, school, and profile photo may generally be hidden or masked from other Users. However, you must understand the following:',
          ko: '익명게시판에서는 다른 이용자에게 작성자 표시명·학교·프로필 사진 등이 기본적으로 가려지거나 마스킹될 수 있습니다. 그러나 다음 사항을 반드시 이해해야 합니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Anonymous display is a UI policy to reduce identity exposure to other ordinary Users. It does not mean complete anonymity, untraceability, or legal immunity toward the Company.',
              ko: '익명 표시는 “다른 일반 이용자에게 신원이 드러나지 않도록 돕는 UI 정책”이며, 회사에 대한 완전한 익명성·추적 불가능성·법적 면책을 의미하지 않습니다.',
            },
            {
              en: 'Login may be required to edit or delete posts, prevent abuse, and handle reports. The Company may review related records for operations, security, legal compliance, and legitimate requests.',
              ko: '로그인은 글의 수정·삭제·남용 방지·신고 대응을 위해 필요할 수 있으며, 회사는 운영·보안·법령·정당한 요청에 따라 관련 기록을 확인할 수 있습니다.',
            },
            {
              en: 'Even when posted anonymously, targeting or implying a specific person, gossip-style defamation, false statements, and privacy invasions are prohibited. The same or stricter enforcement as other boards may apply.',
              ko: '익명이어도 특정인 지칭·암시, 뒷담화성 비방, 허위사실, 사생활 침해는 금지되며, 일반 게시판과 동일하거나 더 엄격한 제재가 적용될 수 있습니다.',
            },
            {
              en: 'You may remain civilly or criminally responsible for anonymous posts.',
              ko: '이용자는 익명 게시물로 인해 발생하는 민·형사상 책임에서 자유롭지 않을 수 있습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'housing-transactions',
      title: '8. Housing, Roommate Posts, Brokerage Roles, and Fees',
      titleKo: '8. 하우징·룸메이트·중개 역할 및 수수료',
      blocks: [
        {
          type: 'p',
          en: '8.1 Two different roles on the Services. Misaeng NYC includes both (a) community information and peer-to-peer posts (for example roommate/sublet boards and User-generated tips) and (b) housing-related activity that may involve New York–licensed real estate professionals affiliated with the Company and/or a partner brokerage (which may include Fact Real Estate or another licensed brokerage). These roles are not the same, and the applicable duties depend on the facts of each interaction.',
          ko: '8.1 서비스상의 두 가지 역할. Misaeng NYC에는 (a) 커뮤니티 정보·개인간 게시(룸메이트·서블렛 게시판, 이용자 팁 등)와 (b) 회사 및/또는 파트너 브로커리지(Fact Real Estate 등 면허 브로커리지 포함 가능)에 소속·제휴된 뉴욕주 공인 부동산 전문가의 하우징 관련 활동이 함께 있을 수 있습니다. 역할이 동일하지 않으며, 각 상호작용의 사실에 따라 적용되는 의무가 달라집니다.',
        },
        {
          type: 'p',
          en: '8.2 Peer-to-peer and informational use. For roommate/sublet posts, community discussions, and other User-to-User communications where no licensed brokerage representation is offered or accepted, the Company is not your landlord, tenant, escrow agent, or guarantor, and does not automatically become your real estate broker or salesperson solely because content appears on the Services. You must independently verify counterparties, terms, payment requests, identity, and authority. Be especially careful with high-risk payment methods such as advance deposits, cash wires, gift cards, or cryptocurrency, and report suspicious requests.',
          ko: '8.2 개인간·정보성 이용. 룸메이트·서블렛 게시, 커뮤니티 토론 등 면허 중개 대리가 제안·수락되지 않은 이용자 간 소통에 대해, 회사는 귀하의 임대인·임차인·에스크로·보증인이 아니며, 콘텐츠가 서비스에 게시되었다는 사실만으로 자동으로 귀하의 부동산 브로커·세일즈퍼슨이 되지 않습니다. 상대방·조건·입금 요청·신분·권한은 스스로 확인해야 합니다. 선입금·현금 송금·기프트카드·암호화폐 등 위험 결제수단에 특히 주의하고, 의심 요청은 신고해 주세요.',
        },
        {
          type: 'p',
          en: '8.3 Licensed brokerage activity and agency disclosure. Where a New York–licensed real estate salesperson or broker affiliated with the Company or a partner brokerage introduces, shows, negotiates, or otherwise assists with a rental or related real-estate transaction, an agency or brokerage relationship may arise under New York law. New York requires clear disclosure of agency relationships in many residential real-estate dealings (see, among other authorities, N.Y. Real Property Law §443 and related Department of State brokerage rules and forms). In those cases:',
          ko: '8.3 면허 중개 활동 및 대리관계 공시. 회사 또는 파트너 브로커리지에 소속·제휴된 뉴욕주 공인 부동산 세일즈퍼슨·브로커가 임대 등 부동산 거래의 소개·쇼잉·협상·지원을 하는 경우, 뉴욕주 법률에 따른 대리·중개 관계가 성립할 수 있습니다. 뉴욕주는 많은 주거용 부동산 거래에서 대리관계의 명확한 공시를 요구합니다(예: N.Y. Real Property Law §443 및 관련 Department of State 중개 규정·양식). 이 경우:',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'You may receive separate written or electronic agency disclosures, listing agreements, compensation disclosures, dual-agency notices, or other brokerage documents. Those documents control the brokerage relationship for that transaction and prevail over general platform disclaimers to the extent of any conflict.',
              ko: '별도 서면·전자 대리관계 공시, 리스팅 계약, 보수 공시, 이중대리 고지 또는 기타 중개 서류를 받을 수 있습니다. 해당 거래의 중개 관계에 대해서는 그 서류가 우선하며, 일반 플랫폼 면책과 충돌할 경우 해당 서류가 우선합니다.',
            },
            {
              en: 'Licensed activity is performed under the supervision of the applicable licensed brokerage, subject to New York Department of State rules and brokerage policies—not merely as an unregulated “community post.”',
              ko: '면허 활동은 해당 면허 브로커리지의 감독과 뉴욕주 Department of State 규정·브로커리지 정책에 따르며, 규제되지 않는 “커뮤니티 게시”와 동일하지 않습니다.',
            },
            {
              en: 'Unless a separate agreement says otherwise, the Company does not guarantee that any particular unit will be available, approved, priced as displayed, or successfully leased.',
              ko: '별도 계약이 없는 한, 회사는 특정 유닛의 공실·승인·표시 가격·계약 성사를 보장하지 않습니다.',
            },
          ],
        },
        {
          type: 'p',
          en: '8.4 Broker fees, “no-broker-fee” labels, and New York City rules (including the FARE Act). Labels such as “no broker fee,” “OP,” owner-pays, or similar fee badges on listings are informational summaries based on data available at the time of posting. They are not a warranty that you will never pay any fee, concession charge, or other cost. New York City’s Fairness in Apartment Rental Expenses (FARE) Act and related rules have changed how broker fees may be charged and disclosed in many rental situations. Fee responsibility can depend on who engaged the broker, the listing’s compensation structure, and applicable law at the time of your deal. Always confirm fee allocation in writing before you tour, apply, or sign. Marketing phrases about “broker-fee-free” inventory must be read together with then-current NYC law and the specific listing/brokerage disclosures—not as a blanket legal conclusion for every property.',
          ko: '8.4 브로커 수수료, “중개비 무료” 라벨, 뉴욕시 규정(FARE Act 포함). 매물의 “no broker fee”, “OP”, 소유자 부담, 유사 수수료 배지는 게시 시점 데이터에 따른 정보 요약이며, 귀하가 어떠한 수수료·비용도 내지 않는다는 보증이 아닙니다. 뉴욕시 Fairness in Apartment Rental Expenses(FARE) Act 및 관련 규정으로 많은 임대 상황에서 브로커 수수료의 청구·공시 방식이 달라졌습니다. 수수료 부담은 누가 브로커를 고용했는지, 리스팅 보수 구조, 거래 시점의 적용법에 따라 달라질 수 있습니다. 투어·신청·계약 전에 서면으로 수수료 배분을 확인하세요. “broker-fee-free” 등 마케팅 문구는 당시 NYC 법과 해당 매물/중개 공시와 함께 읽어야 하며, 모든 매물에 대한 일률적 법적 결론이 아닙니다.',
        },
        {
          type: 'note',
          en: 'Nothing in these Terms is a substitute for the agency, compensation, or other disclosures required by New York law in a licensed real-estate transaction. If you are unsure whether a licensed professional is representing you, ask before sharing personal or financial information or paying any fee.',
          ko: '본 약관의 어떤 문구도 면허 부동산 거래에서 뉴욕주법이 요구하는 대리·보수 등 공시를 대체하지 않습니다. 면허 전문가가 귀하를 대리하는지 불확실하면, 개인·금융 정보를 공유하거나 수수료를 지급하기 전에 확인해 주세요.',
        },
      ],
    },
    {
      id: 'fair-housing',
      title: '9. Fair Housing and Equal Opportunity',
      titleKo: '9. 공정주거 및 평등한 기회',
      blocks: [
        {
          type: 'p',
          en: 'Misaeng supports equal housing opportunity. The Company and Users must not use the Services to discriminate in the rental, sale, or financing of housing, or in the terms or availability of housing-related services, on the basis of race, color, national origin, religion, sex (including gender identity and sexual orientation), familial status, disability, lawful source of income, age, marital status, military status, or any other characteristic protected by the federal Fair Housing Act, New York State Human Rights Law, New York City Human Rights Law, or other applicable fair-housing rules.',
          ko: 'Misaeng는 평등한 주거 기회를 지지합니다. 회사와 이용자는 연방 Fair Housing Act, 뉴욕주 Human Rights Law, 뉴욕시 Human Rights Law 및 기타 적용 공정주거 규정으로 보호되는 인종, 피부색, 출신 국가, 종교, 성(젠더 아이덴티티·성적 지향 포함), 가족 상황, 장애, 합법적 소득원, 연령, 혼인 여부, 군인 신분 등 보호 특성을 이유로 주택의 임대·매매·금융 또는 주거 관련 서비스의 조건·이용 가능성에서 차별하기 위해 서비스를 이용해서는 안 됩니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Housing advertisements and roommate posts must comply with fair-housing advertising rules. Preferences that unlawfully exclude protected classes are prohibited.',
              ko: '하우징 광고 및 룸메이트 게시물은 공정주거 광고 규칙을 준수해야 합니다. 보호 계층을 위법하게 배제하는 선호 조건은 금지됩니다.',
            },
            {
              en: 'If you believe a listing or User has engaged in unlawful housing discrimination, contact info@misaeng.com. You may also contact HUD, the New York State Division of Human Rights, or the NYC Commission on Human Rights.',
              ko: '매물 또는 이용자의 위법한 주거 차별이 의심되면 info@misaeng.com 으로 연락해 주세요. HUD, 뉴욕주 Division of Human Rights, 뉴욕시 Commission on Human Rights에도 신고할 수 있습니다.',
            },
            {
              en: 'The Company may remove Content or restrict accounts that appear to violate fair-housing laws, without creating an obligation to police every listing in advance.',
              ko: '회사는 공정주거법 위반으로 보이는 콘텐츠를 삭제하거나 계정을 제한할 수 있으나, 모든 매물을 사전에 검열할 의무를 지지는 않습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'no-advice',
      title: '10. Visa, Career, Legal, and Tax Information — Not Advice',
      titleKo: '10. 비자·취업·법률·세무 정보 — 조언이 아님',
      blocks: [
        {
          type: 'p',
          en: 'Posts and comments about OPT, CPT, visas, green cards, job reviews, interviews, schools, or workplaces may reflect individual experiences or opinions. They are not official legal, immigration, tax, or career advice from the Company or any author.',
          ko: 'OPT·CPT·비자·영주권·취업 후기·면접 후기·학교·직장 관련 게시물과 댓글은 이용자 개인의 경험·의견에 기반한 정보 공유일 수 있으며, 회사 또는 작성자의 공식 법률·이민·세무·진로 자문이 아닙니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Immigration, labor, and school rules change frequently and outcomes vary by individual circumstances. Confirm important decisions with qualified professionals and official sources.',
              ko: '이민·노동·학교 규정은 수시로 변경되며 개인 상황에 따라 결과가 다릅니다. 중요한 결정은 반드시 자격 있는 전문가 및 공식 기관 안내를 확인하십시오.',
            },
            {
              en: 'The Company does not warrant the completeness, currency, or accuracy of reviews or process descriptions.',
              ko: '회사는 게시된 후기·절차 설명의 완전성·최신성·정확성을 보증하지 않습니다.',
            },
            {
              en: 'Coffee chats, mentoring, or advisory connections that may be offered through credit rewards do not, unless expressly stated otherwise, mean the Company is substituting for licensed professional advice or guaranteeing outcomes.',
              ko: '크레딧 보상으로 제공될 수 있는 커피챗·멘토링·자문 연계 또한, 별도 고지가 없는 한 회사의 전문 자격 대행이나 결과 보장을 의미하지 않습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'credits',
      title: '11. Community Credits',
      titleKo: '11. 커뮤니티 크레딧',
      blocks: [
        {
          type: 'p',
          en: 'Community Credits are a rewards program to encourage engagement. The Company may award, adjust, reclaim, or expire credits under its policies, limits, and calculation methods.',
          ko: '커뮤니티 크레딧은 서비스 활성화를 위한 리워드 프로그램으로, 회사의 정책·한도·산정 방식에 따라 부여·조정·회수·소멸될 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Credits cannot be redeemed for cash or withdrawn, and may not be inherited, transferred, or pledged except where the Company expressly allows.',
              ko: '크레딧은 현금으로 환전·인출할 수 없으며, 상속·양도·담보 제공이 금지될 수 있습니다(회사가 명시적으로 허용한 경우 제외).',
            },
            {
              en: 'If fraudulent earning is found (multiple accounts, fake posts, manipulated engagement, etc.), credits and related rewards may be canceled and accounts sanctioned.',
              ko: '부정 적립(다중 계정, 허위 게시, 조작된 참여 등)이 확인되면 크레딧 및 관련 보상이 취소되고 계정이 제재될 수 있습니다.',
            },
            {
              en: 'Reward applications and fulfillment may be delayed, changed, or declined due to inventory, scheduling, partner constraints, or operating policy.',
              ko: '보상 신청·이행은 재고·일정·파트너 사정·운영 정책에 따라 지연·변경·거절될 수 있습니다.',
            },
            {
              en: 'If the Services end or the program changes, unused credits may create no compensation obligation.',
              ko: '서비스 종료 또는 프로그램 변경 시 미사용 크레딧에 대한 보상 의무가 발생하지 않을 수 있습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'ip',
      title: '12. Company Intellectual Property',
      titleKo: '12. 회사의 지식재산권',
      blocks: [
        {
          type: 'p',
          en: 'Trademarks, logos, designs, software, databases, copy, graphics, and other elements of the Services belonging to the Company or its licensors remain the Company’s property. These Terms grant you only a limited, non-exclusive, non-transferable right to access the Services for ordinary personal use.',
          ko: '서비스의 상표, 로고, 디자인, 소프트웨어, 데이터베이스, 문안, 그래픽 등 회사 또는 라이선스 제공자에게 귀속되는 요소에 대한 권리는 회사에 있습니다. 본 약관은 이용자에게 서비스의 통상적 이용에 필요한 제한적·비독점적·양도 불가한 접근 권한만을 부여합니다.',
        },
        {
          type: 'p',
          en: 'Unauthorized copying, mirroring, crawling beyond ordinary personal browsing, resale, framing, or trademark use of Company assets is prohibited.',
          ko: '회사 자산의 무단 복제, 미러링, 크롤링(합리적인 개인적 열람을 넘는 자동화 수집), 재판매, 프레임 삽입, 상표 사용은 금지됩니다.',
        },
      ],
    },
    {
      id: 'third-party',
      title: '13. Third-Party Services and Links',
      titleKo: '13. 제3자 서비스 및 링크',
      blocks: [
        {
          type: 'p',
          en: 'The Services may connect to or rely on Third-Party Services such as maps/place search, login, email, social media, payments, or scheduling tools. Those services are governed by their own terms and privacy policies. The Company is not responsible for their content, availability, or security.',
          ko: '서비스는 지도·장소 검색, 로그인, 이메일, 소셜 미디어, 결제·일정 도구 등 제3자 서비스에 연결되거나 이를 이용할 수 있습니다. 제3자 서비스에는 해당 제공자의 약관·개인정보처리방침이 적용되며, 회사는 제3자 서비스의 내용·가용성·보안에 대해 책임을 지지 않습니다.',
        },
      ],
    },
    {
      id: 'copyright',
      title: '14. Copyright Complaints and DMCA Designated Agent',
      titleKo: '14. 저작권 침해 신고 및 DMCA Designated Agent',
      blocks: [
        {
          type: 'p',
          en: 'We respect intellectual property rights and respond to notices of alleged copyright infringement consistent with the Digital Millennium Copyright Act (17 U.S.C. §512). The Company has designated an agent with the U.S. Copyright Office (Registration Number: DMCA-1079570). Please send DMCA notices to our Designated Agent using the contact information below, or confirm our current listing in the U.S. Copyright Office’s online DMCA Designated Agent Directory at copyright.gov.',
          ko: '회사는 지식재산권을 존중하며 Digital Millennium Copyright Act(17 U.S.C. §512)에 따른 저작권 침해 신고에 대응합니다. 회사는 U.S. Copyright Office에 Designated Agent를 등록했습니다 (등록번호: DMCA-1079570). DMCA 통지는 아래 Designated Agent 연락처로 보내 주시거나, copyright.gov 의 U.S. Copyright Office DMCA Designated Agent 온라인 디렉터리에서 회사의 최신 등록 정보를 확인하실 수 있습니다.',
        },
        {
          type: 'p',
          en: 'DMCA Designated Agent (for copyright complaints):',
          ko: 'DMCA Designated Agent (저작권 신고용):',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Name: Copyright Agent, Misaeng LLC',
              ko: '성명/명칭: Copyright Agent, Misaeng LLC',
            },
            {
              en: 'Mail: 45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States — Attn: Copyright Agent',
              ko: '우편: 45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States — Attn: Copyright Agent',
            },
            {
              en: 'Email: info@misaeng.com',
              ko: '이메일: info@misaeng.com',
            },
          ],
        },
        {
          type: 'p',
          en: 'A valid notice should include at least:',
          ko: '유효한 신고에는 최소한 다음이 포함되어야 합니다:',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Your contact information and, if applicable, authorization to act for the rights holder',
              ko: '권리자의 연락처 및 (대리인인 경우) 위임 관계',
            },
            {
              en: 'A description of the copyrighted work and where the original may be found',
              ko: '침해되었다고 주장하는 저작물의 설명 및 원본 위치',
            },
            {
              en: 'The URL or other information reasonably sufficient to locate the allegedly infringing material on the Services',
              ko: '서비스 내 침해 게시물의 URL 또는 충분한 특정 정보',
            },
            {
              en: 'A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law',
              ko: '해당 이용이 저작권자·대리인·법률에 의해 허용되지 않는다고 선의로 믿는다는 진술',
            },
            {
              en: 'A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act',
              ko: '위증 시 처벌을 감수하며 신고 내용이 정확하고 권한이 있다는 진술',
            },
            {
              en: 'An electronic or physical signature of the complaining party',
              ko: '신고 당사자의 전자서명 또는 이에 준하는 서명',
            },
          ],
        },
        {
          type: 'p',
          en: 'If we remove or disable access to material, we may notify the User who posted it. That User may submit a counter-notification under §512(g). The Company may terminate accounts of repeat infringers in appropriate circumstances.',
          ko: '자료를 삭제하거나 접근을 차단하는 경우 게시 이용자에게 통지할 수 있습니다. 해당 이용자는 §512(g)에 따른 반박 통지(counter-notification)를 제출할 수 있습니다. 회사는 반복 침해자에 대해 적절한 경우 계정을 해지할 수 있습니다.',
        },
      ],
    },
    {
      id: 'moderation',
      title: '15. Reports, Monitoring, and Enforcement',
      titleKo: '15. 신고, 모니터링 및 조치',
      blocks: [
        {
          type: 'p',
          en: 'The Company may review Content and accounts based on User reports, automated or manual review, and lawful requests. The Company has no duty to pre- or post-screen all Content and retains discretion over whether, when, and how to act.',
          ko: '회사는 이용자 신고, 자동/수동 검토, 법령상 요청에 따라 콘텐츠와 계정을 검토할 수 있습니다. 회사는 모든 콘텐츠를 사전·사후 검열할 의무가 없으며, 조치 여부·시점·방법에 관한 재량을 보유합니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'In emergencies involving threats of self-harm or harm to others, information may be provided to law enforcement or emergency services.',
              ko: '긴급 위험(자해·타해 위협 등)이 있는 경우 수사·응급기관에 정보가 제공될 수 있습니다.',
            },
            {
              en: 'False or malicious reports may themselves be grounds for sanctions.',
              ko: '허위·악의적 신고는 그 자체로 제재 사유가 될 수 있습니다.',
            },
            {
              en: 'You may raise concerns about enforcement through our inquiry channels as instructed, but restoration is not guaranteed.',
              ko: '조치에 대한 이의는 안내에 따라 문의 채널로 제기할 수 있으나, 회사는 모든 요청에 대한 복구를 보장하지 않습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'availability',
      title: '16. Availability, Changes, and Interruptions',
      titleKo: '16. 서비스 제공, 변경 및 중단',
      blocks: [
        {
          type: 'p',
          en: 'The Company uses commercially reasonable efforts to provide the Services but does not guarantee uninterrupted or error-free operation or compatibility with every device or browser. Maintenance, outages, force majeure, third-party infrastructure failures, or legal changes may delay, limit, or interrupt the Services.',
          ko: '회사는 상업적으로 합리적인 노력을 기울여 서비스를 제공하지만, 무중단·무오류·특정 기기·브라우저 호환성을 보증하지 않습니다. 유지보수, 장애, 천재지변, 제3자 인프라 장애, 법령 변경 등으로 서비스가 지연·제한·중단될 수 있습니다.',
        },
      ],
    },
    {
      id: 'disclaimers',
      title: '17. Disclaimer of Warranties',
      titleKo: '17. 보증의 부인',
      blocks: [
        {
          type: 'p',
          en: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES AND ALL CONTENT ARE PROVIDED “AS IS” AND “AS AVAILABLE.” THE COMPANY DISCLAIMS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, AND AVAILABILITY.',
          ko: '관련 법령이 허용하는 최대 범위에서, 서비스 및 모든 콘텐츠는 “있는 그대로(AS IS)” 및 “제공 가능한 상태로(AS AVAILABLE)” 제공됩니다. 회사는 상품성, 특정 목적 적합성, 비침해, 정확성, 신뢰성, 가용성에 관한 명시적·묵시적 보증을 부인합니다.',
        },
      ],
    },
    {
      id: 'liability',
      title: '18. Limitation of Liability',
      titleKo: '18. 책임의 제한',
      blocks: [
        {
          type: 'p',
          en: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY AND ITS OFFICERS, EMPLOYEES, AGENTS, AND PARTNERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, OR LOST BUSINESS OPPORTUNITIES, ARISING FROM OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
          ko: '관련 법령이 허용하는 최대 범위에서, 회사 및 그 임직원·대리인·파트너는 서비스 이용 또는 이용 불능으로 인한 간접·부수·특별·결과적·징벌적 손해, 일실이익, 데이터 손실, 영업 기회 손실에 대해 책임지지 않습니다. 이는 회사가 해당 손해 가능성을 고지받았더라도 마찬가지입니다.',
        },
        {
          type: 'p',
          en: 'THE COMPANY’S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU ACTUALLY PAID TO THE COMPANY FOR THE SERVICES IN THE TWELVE (12) MONTHS BEFORE THE CLAIM AROSE, OR (B) ONE HUNDRED U.S. DOLLARS (US $100). SOME JURISDICTIONS LIMIT LIABILITY CAPS; IN THOSE CASES THE LIMITATION APPLIES ONLY TO THE EXTENT PERMITTED.',
          ko: '회사의 총 누적 책임은, 청구 원인 발생 직전 12개월 동안 이용자가 서비스와 관련하여 회사에 실제로 지급한 금액(없는 경우 미화 100달러)을 상한으로 합니다. 일부 관할에서는 책임 제한이 제한될 수 있으며, 이 경우 법이 허용하는 범위에서만 적용됩니다.',
        },
      ],
    },
    {
      id: 'indemnity',
      title: '19. Indemnification',
      titleKo: '19. 면책(Indemnification)',
      blocks: [
        {
          type: 'p',
          en: 'You agree to defend, indemnify, and hold harmless the Company and its related parties from and against claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of your Content, transactions, violation of these Terms or law, or infringement of third-party rights.',
          ko: '이용자는 자신의 게시물, 거래, 약관·법령 위반, 제3자 권리 침해로 인해 회사 및 관련자가 입는 청구·손해·비용(합리적인 변호사 비용 포함)으로부터 회사를 방어·배상·면책해야 합니다.',
        },
      ],
    },
    {
      id: 'termination',
      title: '20. Suspension and Termination',
      titleKo: '20. 이용 제한 및 해지',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              en: 'You may stop using the Services at any time and may request account deletion through available procedures.',
              ko: '이용자는 언제든지 서비스 이용을 중단하고, 제공되는 절차에 따라 계정 삭제를 요청할 수 있습니다.',
            },
            {
              en: 'The Company may restrict use or terminate accounts, with notice before or after the action as appropriate, for Terms or policy violations, prolonged inactivity, legal risk, or Service shutdown.',
              ko: '회사는 약관·정책 위반, 장기 미이용, 법적 위험, 서비스 종료 등의 사유로 사전 또는 사후 통지와 함께 이용을 제한하거나 계정을 해지할 수 있습니다.',
            },
            {
              en: 'Provisions that by their nature should survive termination (including intellectual property, indemnification, limitation of liability, and dispute resolution) will survive.',
              ko: '해지 후에도 지식재산, 면책, 책임 제한, 분쟁 해결 등 성질상 존속이 필요한 조항은 유효합니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'changes',
      title: '21. Changes to These Terms',
      titleKo: '21. 약관의 변경',
      blocks: [
        {
          type: 'p',
          en: 'We may revise these Terms from time to time. Material changes will be communicated through on-Service notice, email, or other reasonable means. Continued use after the stated effective date constitutes acceptance of the revised Terms. If you do not agree, you must stop using the Services.',
          ko: '회사는 필요 시 본 약관을 개정할 수 있습니다. 중요한 변경은 서비스 내 공지, 이메일 또는 기타 합리적인 방법으로 고지하며, 고지한 효력 발생일 이후 서비스를 계속 이용하면 변경에 동의한 것으로 봅니다. 변경에 동의하지 않으면 이용을 중단해야 합니다.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: '22. Governing Law; Informal Resolution; Arbitration; Class-Action Waiver',
      titleKo: '22. 준거법, 사전 협의, 중재, 집단소송 포기',
      emphasized: true,
      blocks: [
        {
          type: 'note',
          en: 'IMPORTANT — PLEASE READ. This Section includes a binding individual arbitration agreement and a class-action waiver that affect your legal rights. You may opt out within 30 days as described in Section 22.7.',
          ko: '중요 — 꼭 읽어 주세요. 본 조에는 법적 권리에 영향을 미치는 구속력 있는 개별 중재 합의 및 집단소송 포기 조항이 포함됩니다. 22.7에 따라 30일 이내 옵트아웃할 수 있습니다.',
        },
        {
          type: 'p',
          en: '22.1 Governing law. These Terms and disputes relating to the Services are governed by the laws of the State of New York, United States, without regard to conflict-of-law principles, except that the Federal Arbitration Act governs the interpretation and enforcement of the arbitration agreement below to the fullest extent permitted.',
          ko: '22.1 준거법. 본 약관 및 서비스 관련 분쟁에는 미국 뉴욕주 법률(법 충돌 원칙 제외)이 적용됩니다. 다만 아래 중재 합의의 해석·집행에는 허용되는 최대 범위에서 Federal Arbitration Act가 적용됩니다.',
        },
        {
          type: 'p',
          en: '22.2 Informal resolution first. Before starting arbitration or a lawsuit that is not subject to arbitration, you and the Company agree to try to resolve the dispute informally for at least thirty (30) days after written notice to info@misaeng.com (include your name, the email on your account, a description of the dispute, and the relief sought).',
          ko: '22.2 사전 협의. 중재 또는 중재 대상이 아닌 소송을 시작하기 전에, 귀하와 회사는 info@misaeng.com 으로 서면 통지(이름, 계정 이메일, 분쟁 내용, 구하는 구제) 후 최소 30일간 성실한 비공식 해결을 시도하기로 합니다.',
        },
        {
          type: 'p',
          en: '22.3 Binding individual arbitration. Except for the carve-outs below, you and the Company agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Services will be resolved by binding individual arbitration administered by the American Arbitration Association (“AAA”) under its Consumer Arbitration Rules (or other AAA rules the AAA determines apply). The arbitration will be conducted in English. Hearings may be held in New York County, New York, or by video/phone as the arbitrator allows. Judgment on the award may be entered in any court of competent jurisdiction.',
          ko: '22.3 구속력 있는 개별 중재. 아래 예외를 제외하고, 본 약관 또는 서비스에서 비롯되거나 이와 관련된 모든 분쟁·청구·쟁점은 American Arbitration Association(AAA)의 Consumer Arbitration Rules(또는 AAA가 적용한다고 정하는 규칙)에 따른 구속력 있는 개별 중재로 해결합니다. 중재는 영어로 진행되며, 심리는 뉴욕주 New York County 또는 중재인이 허용하는 화상/전화로 진행될 수 있습니다. 중재판정은 관할 법원에 집행판결을 구할 수 있습니다.',
        },
        {
          type: 'p',
          en: '22.4 Class-action and representative-action waiver. YOU AND THE COMPANY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, PRIVATE ATTORNEY GENERAL, OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person’s claims or otherwise preside over any form of representative proceeding, unless both parties agree in writing after the dispute arises.',
          ko: '22.4 집단·대표소송 포기. 귀하와 회사는 상대방에 대한 청구를 오직 개인 자격으로만 제기할 수 있으며, 집단·집합·병합·사인검찰(private attorney general)·대표 소송의 원고 또는 구성원으로서 제기할 수 없습니다. 분쟁 발생 후 양 당사자가 서면 합의하지 않는 한, 중재인은 복수 개인의 청구를 병합하거나 대표 절차를 주재할 수 없습니다.',
        },
        {
          type: 'p',
          en: '22.5 Carve-outs. This arbitration agreement does not require arbitration of: (a) individual claims in small-claims court within that court’s jurisdiction; (b) claims for injunctive or other equitable relief to stop unauthorized use or infringement of intellectual property; or (c) claims that applicable law prohibits from being subject to pre-dispute arbitration (including certain rights that cannot be waived). Disputes about whether a claim is arbitrable are for the arbitrator to decide, except that a court may decide gateway issues of enforceability of this Section’s class waiver if required by controlling law.',
          ko: '22.5 예외. 다음에는 본 중재 합의가 강제 중재를 요구하지 않습니다: (a) 소액재판소 관할 내 개인 청구; (b) 지식재산의 무단 이용·침해를 막기 위한 금지명령 등 형평법상 구제; (c) 적용법이 사전 중재 합의 대상에서 금지하는 청구(포기할 수 없는 권리 포함). 청구의 중재 가능성에 관한 분쟁은 원칙적으로 중재인이 판단하되, 통제법상 요구되는 경우 본 조의 집단소송 포기 집행 가능성 등 gateway 쟁점은 법원이 판단할 수 있습니다.',
        },
        {
          type: 'p',
          en: '22.6 Licensed real-estate matters. Separate brokerage agreements, agency disclosures, or New York Department of State / licensing procedures may provide additional or different dispute paths for a specific licensed transaction. Those documents control that brokerage relationship. This Section still applies to platform/community disputes that are not governed by such separate brokerage paperwork, to the extent permitted by law.',
          ko: '22.6 면허 부동산 사항. 개별 중개 계약, 대리관계 공시, 또는 뉴욕주 Department of State/라이선스 절차가 특정 면허 거래에 대해 추가·다른 분쟁 경로를 둘 수 있으며, 해당 중개 관계에는 그 서류가 우선합니다. 법이 허용하는 범위에서, 그러한 별도 중개 서류가 규율하지 않는 플랫폼·커뮤니티 분쟁에는 본 조가 계속 적용됩니다.',
        },
        {
          type: 'p',
          en: '22.7 30-day opt-out. You may opt out of this arbitration agreement by emailing info@misaeng.com with subject line “Arbitration Opt-Out” within thirty (30) days after you first accept these Terms (or after this arbitration section first becomes applicable to you). Include your full name and account email. Opting out does not affect other Terms.',
          ko: '22.7 30일 옵트아웃. 본 약관에 처음 동의한 날(또는 본 중재 조항이 처음 적용된 날)부터 30일 이내에 제목 “Arbitration Opt-Out”으로 info@misaeng.com 에 이메일하면 본 중재 합의에서 옵트아웃할 수 있습니다. 성명과 계정 이메일을 포함하세요. 옵트아웃은 나머지 약관에 영향을 주지 않습니다.',
        },
        {
          type: 'p',
          en: '22.8 Court venue if arbitration does not apply. If a claim is not subject to arbitration, exclusive venue lies in the state or federal courts located in New York County, New York, subject to any non-waivable consumer protections.',
          ko: '22.8 중재가 적용되지 않는 경우의 관할. 청구가 중재 대상이 아니면, 소비자의 강행법상 권리를 침해하지 않는 범위에서 뉴욕주 New York County 소재 주·연방 법원이 배타적 관할입니다.',
        },
      ],
    },
    {
      id: 'misc',
      title: '23. Miscellaneous',
      titleKo: '23. 기타',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              en: 'If any provision is held invalid or unenforceable, the remaining provisions remain in effect.',
              ko: '본 약관의 일부 조항이 무효·집행 불능이더라도 나머지 조항은 유효합니다.',
            },
            {
              en: 'Failure by the Company to enforce a right is not a waiver of that right.',
              ko: '회사의 권리 불행사는 권리 포기로 해석되지 않습니다.',
            },
            {
              en: 'You may not assign these Terms without the Company’s prior written consent. The Company may assign its rights in connection with a merger, acquisition, or business transfer.',
              ko: '이용자는 회사의 사전 서면 동의 없이 본 약관상 권리를 양도할 수 없습니다. 회사는 사업 양도·합병 시 권리를 이전할 수 있습니다.',
            },
            {
              en: 'These Terms constitute the entire agreement between you and the Company regarding the Services and supersede prior oral or written understandings, except where a separate written agreement expressly controls.',
              ko: '본 약관은 서비스 이용에 관한 당사자 간 완전한 합의를 구성하며, 이전의 구두·서면 합의에 우선합니다(별도 서면 계약이 명시적으로 우선하는 경우 제외).',
            },
            {
              en: 'Personal information is handled under the Privacy Policy.',
              ko: '개인정보 처리에 관한 사항은 「개인정보처리방침(Privacy Policy)」이 적용됩니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: '24. Contact',
      titleKo: '24. 문의',
      blocks: [
        {
          type: 'p',
          en: 'Questions about these Terms may be sent to:',
          ko: '본 약관에 관한 문의는 아래로 연락해 주세요.',
        },
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
              en: 'Email: info@misaeng.com',
              ko: '이메일: info@misaeng.com',
            },
          ],
        },
      ],
    },
  ],
}
