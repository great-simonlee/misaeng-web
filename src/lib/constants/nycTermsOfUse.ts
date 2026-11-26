import type { LegalDocument } from '@lib/constants/legalDocument'

/** Misaeng · Ellieo Terms of Use (apps + misaeng.com) — English controls; Korean and Vietnamese are convenience translations */
export const NYC_TERMS_OF_USE: LegalDocument = {
  eyebrow: 'LEGAL',
  title: 'Terms of Use',
  titleKo: '이용약관',
  version: '2026-11-24',
  lastUpdated: 'November 24, 2026',
  lastUpdatedKo: '2026년 11월 24일',
  effectiveDate: 'November 24, 2026',
  effectiveDateKo: '2026년 11월 24일',
  contactEmail: 'info@misaeng.com',
  companyName: 'Misaeng LLC',
  companyAddress:
    '45 Rockefeller Plaza, Fl 20, New York, NY 10111, United States',
  languageNotice: {
    en: 'The English version of these Terms is the official and controlling version. Korean and Vietnamese translations are provided for convenience only; a paragraph that has not yet been translated is shown in English. If there is any conflict or inconsistency between the English version and a translation, the English version prevails.',
    ko: '본 약관의 영문본이 공식·기준 문서이며, 한국어·베트남어 번역본은 이해를 돕기 위한 참고용입니다(아직 번역되지 않은 문단은 영어로 표시됩니다). 영문본과 번역본에 차이·불일치가 있을 경우 영문본이 우선합니다.',
  },
  intro: [
    {
      en: 'These Terms of Use (the “Terms”) govern your access to and use of the Misaeng mobile apps for iOS and Android, the misaeng.com websites (including our New York and Boston communities), and related online services operated by Misaeng LLC (“Company,” “we,” “us,” or “Misaeng”), including the community platform for international students and professionals known as “Misaeng” and its multilingual edition “Ellieo” (collectively, the “Services”). Misaeng and Ellieo share one account system and the same community Content, so one account works on both, and these Terms apply to both.',
      ko: '본 이용약관(이하 “본 약관”)은 Misaeng LLC(이하 “회사”, “당사”, “Misaeng”)가 운영하는 iOS·Android용 미생 모바일 앱, misaeng.com 웹사이트(뉴욕·보스턴 커뮤니티 포함) 및 관련 온라인 서비스, 특히 유학생·직장인을 위한 커뮤니티 플랫폼 “미생(Misaeng)”과 그 다국어 서비스 “Ellieo”(이하 통칭 “서비스”)의 이용 조건과 회사와 이용자 간의 권리·의무를 정합니다. 미생과 Ellieo는 하나의 계정 체계와 같은 커뮤니티 게시물을 공유하므로 하나의 계정으로 두 서비스를 모두 이용할 수 있으며, 본 약관은 두 서비스 모두에 적용됩니다.',
    },
    {
      en: 'By accessing, browsing, registering for, posting on, commenting on, contacting us through, using Misaeng Points or Premium in, or otherwise using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, do not use the Services.',
      ko: '서비스에 접속·열람·가입·게시·댓글·문의·미생 포인트 또는 Premium 이용 등 일체의 이용 행위를 하는 경우, 이용자는 본 약관을 읽고 이해하였으며 이에 동의한 것으로 간주됩니다. 동의하지 않는 경우 서비스를 이용하지 마십시오.',
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
              en: '“Marketplace” means the used-goods board where Members list personal items for sale or for free and contact each other about them through in-Service inquiry messages (see Section 10).',
              ko: '“중고거래”란 회원이 개인 물품을 판매하거나 무료로 나누기 위해 등록하고, 서비스 내 문의 메시지로 서로 연락하는 게시판을 말합니다(제10조 참고).',
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
              en: '“Misaeng Points” means in-Service reward units that the Company may award, deduct, or expire under its policies (see Section 13). Points are not cash, securities, or redeemable monetary assets.',
              ko: '“미생 포인트”란 회사가 정책에 따라 적립·차감·소멸시킬 수 있는 서비스 내 보상 단위로(제13조 참고), 현금·유가증권·환금성 자산이 아닙니다.',
            },
            {
              en: '“Premium” or “Misaeng Premium” means the optional paid subscription described in Section 14.',
              ko: '“Premium” 또는 “미생 Premium”이란 제14조에 따른 선택형 유료 구독을 말합니다.',
            },
            {
              en: '“Coffee Chats” and “Career Questions” mean the features through which Members request short conversations with, or send questions to, Members who have set up a mentor profile (see Section 4).',
              ko: '“커피챗” 및 “커리어 질문”이란 회원이 멘토 프로필을 설정한 다른 회원에게 짧은 대화를 신청하거나 질문을 보내는 기능을 말합니다(제4조 참고).',
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
              en: 'You must be at least 18 years old and of legal age to form a binding contract where you live. The Services are not intended for anyone under 18, and we will close accounts we learn belong to someone under 18. Parent accounts are for adult parents or guardians of a Member.',
              ko: '이용자는 만 18세 이상이며 거주지 법령상 계약을 체결할 수 있는 연령이어야 합니다. 서비스는 만 18세 미만을 대상으로 하지 않으며, 만 18세 미만의 계정임을 알게 되면 해당 계정을 해지합니다. 학부모 계정은 회원의 성인 부모 또는 보호자를 위한 계정입니다.',
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
          en: 'Some features (including posting, commenting, saves/likes, My Page, Misaeng Points, Coffee Chats, Career Questions, and Premium) may require Member login and/or additional verification.',
          ko: '일부 기능(글 작성, 댓글, 찜, 마이페이지, 미생 포인트, 커피챗, 커리어 질문, Premium 등)은 회원 로그인 및/또는 추가 인증이 필요할 수 있습니다.',
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
              en: 'Members may also verify a current or former workplace with a work email code or with workplace documents, which the Company reviews before approval. Posts written while a workplace verification is still under review are kept private (visible only to the author) and are published when the verification is approved; commenting is available only after approval. If the verification is rejected, those posts stay private and are deleted thirty (30) days after the rejection.',
              ko: '회원은 회사 이메일 인증 코드 또는 재직·전 직장 서류로 현재 또는 이전 직장을 인증할 수 있으며, 회사가 검토한 뒤 승인합니다. 직장 인증이 검토 중일 때 작성한 글은 비공개(작성자 본인만 볼 수 있음)로 보관되었다가 인증이 승인되면 공개되며, 댓글은 승인 후에 쓸 수 있습니다. 인증이 거절되면 해당 글은 비공개로 남고 거절일로부터 30일 후 삭제됩니다.',
            },
            {
              en: 'Workplace documents must be genuine documents of your own. Before uploading, hide salary and other amounts, Social Security numbers, and any personal information that is not needed to confirm the workplace. Submitting forged or another person’s documents is prohibited and may lead to suspension.',
              ko: '직장 인증 서류는 본인의 실제 서류여야 합니다. 올리기 전에 급여 등 금액, 사회보장번호(SSN), 직장 확인에 필요하지 않은 개인정보를 가려야 합니다. 위조 서류나 타인의 서류를 제출하는 행위는 금지되며 이용 정지 사유가 될 수 있습니다.',
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
        {
          type: 'p',
          en: 'Parent accounts. A verified student may invite up to two (2) parents through a personal invite link. An account created through that link is a parent account and is linked to the inviting student’s account. A parent account may also ask to link with a child by entering the child’s school or personal email; the accounts are linked only if the child accepts the request, and requests expire after 14 days. One parent account may be linked with several children, and one child may be linked with up to two (2) parents in total. Either side may unlink at any time. A linked parent sees only the child’s nickname, profile photo, and Premium status, never the child’s posts, comments, or activity. The following rules apply:',
          ko: '학부모 계정. 인증을 마친 학생은 개인 초대 링크로 부모님을 최대 2명까지 초대할 수 있습니다. 이 링크로 만든 계정은 학부모 계정이며, 초대한 학생의 계정과 연결됩니다. 학부모 계정은 자녀의 학교 또는 개인 이메일을 입력해 연결을 요청할 수도 있으며, 자녀가 요청을 수락한 경우에만 연결되고 요청은 14일 후 만료됩니다. 학부모 계정 하나는 여러 자녀와 연결될 수 있고, 자녀 한 명은 모두 합쳐 최대 2명의 부모님과 연결될 수 있습니다. 양쪽 모두 언제든 연결을 끊을 수 있습니다. 연결된 학부모는 자녀의 닉네임, 프로필 사진, Premium 상태만 볼 수 있으며 자녀의 게시글, 댓글, 활동은 볼 수 없습니다. 다음 규칙이 적용됩니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Parent accounts do not go through school or workplace verification and cannot create parent invites or earn verification rewards.',
              ko: '학부모 계정은 학교·직장 인증을 하지 않으며, 부모님 초대를 만들거나 인증 보상을 받을 수 없습니다.',
            },
            {
              en: 'Parent accounts may write posts only on the Q&A/Free board, may comment on all boards, may send housing inquiries, and may browse and buy on the Marketplace, but may not sell items.',
              ko: '학부모 계정은 질문·자유 게시판에만 글을 쓸 수 있고, 모든 게시판에 댓글을 쓸 수 있으며, 주거 문의를 보낼 수 있고, 중고거래를 둘러보고 구매할 수 있지만 물품을 판매할 수는 없습니다.',
            },
            {
              en: 'Parent accounts may not request coffee chats, send career questions, or act as mentors.',
              ko: '학부모 계정은 커피챗을 신청하거나 커리어 질문을 보내거나 멘토로 활동할 수 없습니다.',
            },
            {
              en: 'The invite reward is paid to the student after the parent’s account has been active for a period set by the Company, and only if the parent account has not been sanctioned, suspended, or deleted by then.',
              ko: '초대 보상은 학부모 계정이 회사가 정한 기간 동안 유지된 뒤, 그때까지 해당 계정이 제재·정지·삭제되지 않은 경우에만 학생에게 지급됩니다.',
            },
            {
              en: 'Misuse of parent accounts — for example a student creating a parent account for themselves, creating fake accounts, or farming invite rewards — is prohibited. If misuse is confirmed, the Company may sanction both linked accounts, including withdrawing rewards, limiting features, or suspending the accounts.',
              ko: '학부모 계정의 부정 사용(예: 학생 본인이 학부모 계정을 만드는 행위, 가짜 계정 생성, 초대 보상 부정 수령)은 금지됩니다. 부정 사용이 확인되면 회사는 연결된 두 계정 모두에 보상 회수, 기능 제한, 이용 정지 등의 제재를 할 수 있습니다.',
            },
            {
              en: 'If a student created a parent account by mistake, the Company may convert it to a regular account on request.',
              ko: '학생이 실수로 학부모 계정을 만든 경우, 요청하면 회사가 일반 계정으로 전환할 수 있습니다.',
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
              en: 'Marketplace: listing personal items for sale or for free and contacting sellers through in-Service inquiry messages (see Section 10)',
              ko: '중고거래: 개인 물품의 판매·무료 나눔 등록 및 서비스 내 문의 메시지를 통한 판매자 연락(제10조 참고)',
            },
            {
              en: 'My Page: your posts, saves, and profile/settings features',
              ko: '마이페이지: 내 글, 찜, 프로필·설정 관련 기능',
            },
            {
              en: 'Misaeng Points: earning points through activity and using them for features and rewards under Company policies (see Section 13)',
              ko: '미생 포인트: 활동에 따른 적립과 회사가 정한 기능·보상에의 사용(제13조 참고)',
            },
            {
              en: 'Coffee Chats and Career Questions: requesting short conversations with, or asking questions of, Members who have set up a mentor profile',
              ko: '커피챗·커리어 질문: 멘토 프로필을 설정한 회원에게 짧은 대화를 신청하거나 질문하기',
            },
            {
              en: 'Misaeng Premium: an optional paid subscription with additional information features such as visa sponsorship history by company and base salary by role (see Section 14)',
              ko: '미생 Premium: 회사별 비자 스폰서 이력, 직무별 기본급 등 추가 정보 기능을 제공하는 선택형 유료 구독(제14조 참고)',
            },
            {
              en: 'Notifications: push notifications and in-app alerts for new job postings, visa news, comments, messages, and similar, which you can manage in settings',
              ko: '알림: 새 채용 공고, 비자 뉴스, 댓글, 메시지 등에 관한 푸시·앱 내 알림(설정에서 관리 가능)',
            },
            {
              en: 'Informational pages such as partners, influencers, and professional services',
              ko: '파트너·인플루언서·전문 서비스 안내 등 정보성 페이지',
            },
            {
              en: 'Multilingual access: the Services are offered in several languages, and Content may be shown on both Misaeng NYC and Ellieo in its original language or in translation (see Section 6)',
              ko: '다국어 이용: 서비스는 여러 언어로 제공되며, 게시물은 원문 또는 번역문으로 Misaeng NYC와 Ellieo 양쪽에 표시될 수 있습니다(제6조 참고)',
            },
            {
              en: 'Customer inquiries via email, contact forms, social channels, and similar',
              ko: '고객 문의(이메일, 문의 페이지, 소셜 채널 등)',
            },
          ],
        },
        {
          type: 'p',
          en: '4.1 Coffee Chats and Career Questions. These features connect Members with other Members who have set up a mentor profile, which may require school or workplace verification. Mentors share their personal experience, not professional, legal, immigration, or tax advice. The Company does not guarantee any outcome (such as a job offer or visa result), is not a party to any arrangement between Members, and does not verify every statement a mentor makes. Do not request or offer money, gifts, or other payment for a Coffee Chat or Career Question outside the Services, and keep conversations respectful. A LinkedIn profile link you choose to share is shown only to the other person after a request is accepted. Requests may expire, and points used for a Career Question are handled as described in Section 13.',
          ko: '4.1 커피챗 및 커리어 질문. 이 기능은 회원과 멘토 프로필을 설정한 다른 회원(학교·직장 인증이 필요할 수 있음)을 연결합니다. 멘토는 개인 경험을 나누는 것이며 전문적인 법률·이민·세무 자문을 제공하는 것이 아닙니다. 회사는 취업·비자 결과 등 어떤 결과도 보장하지 않으며, 회원 간 약속의 당사자가 아니고, 멘토의 모든 발언을 확인하지 않습니다. 서비스 밖에서 커피챗·커리어 질문의 대가로 금전·선물 등을 요구하거나 제안하지 말고, 서로 존중하며 대화해 주세요. 이용자가 공유하기로 한 LinkedIn 프로필 링크는 신청이 수락된 뒤 상대방에게만 표시됩니다. 신청은 기한이 지나면 만료될 수 있으며, 커리어 질문에 사용한 포인트는 제13조에 따라 처리됩니다.',
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
              en: 'Subject to these Terms, you retain ownership of your Content. You grant the Company a worldwide, non-exclusive, royalty-free, transferable, and sublicensable license to use, reproduce, modify, translate into other languages (including with automated or AI-assisted tools), distribute, publicly display, and perform your Content, in its original language and in translation, on Misaeng NYC, Ellieo, and related services, as needed to operate, improve, secure, promote, archive, and legally defend the Services.',
              ko: '게시물의 소유권은 원칙적으로 작성 이용자에게 귀속됩니다. 다만 이용자는 회사에 대해, 서비스 운영·개선·보안·홍보·아카이빙·법령 대응에 필요한 범위에서 게시물을 원문 및 번역문으로 Misaeng NYC, Ellieo 및 관련 서비스에서 사용·복제·수정·다른 언어로 번역(자동·AI 보조 도구 이용 포함)·배포·공중송신·표시할 수 있는 전 세계적·비독점적·무상·양도 가능한(하위 라이선스 가능) 권한을 부여합니다.',
            },
            {
              en: 'Translations of your Content are created by the Company and are deleted when you delete the original Content.',
              ko: '게시물의 번역문은 회사가 작성하며, 이용자가 원문 게시물을 삭제하면 번역문도 함께 삭제됩니다.',
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
      id: 'translations',
      title: '6. Translations',
      titleKo: '6. 번역',
      blocks: [
        {
          type: 'p',
          en: 'To help Users who speak different languages understand each other, the Company may translate Content and Service text into other languages using automated or AI-assisted translation tools, with or without human review, and may show a translation instead of, or together with, the original. Translations are made by the Company; they are not written or approved by the author of the original Content.',
          ko: '서로 다른 언어를 쓰는 이용자들이 내용을 이해할 수 있도록, 회사는 자동·AI 보조 번역 도구를 이용해(사람의 검토를 거치거나 거치지 않고) 게시물과 서비스 문구를 다른 언어로 번역할 수 있으며, 원문 대신 또는 원문과 함께 번역문을 표시할 수 있습니다. 번역문은 회사가 작성한 것이며, 원문 작성자가 작성하거나 승인한 것이 아닙니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Translations may be inaccurate or incomplete or may lose nuance. For Content, the original language version prevails over any translation. Where a translation is shown, you can open the original with “View original.”',
              ko: '번역문은 부정확하거나 불완전할 수 있고 뉘앙스가 달라질 수 있습니다. 게시물은 원문이 번역문보다 우선하며, 번역문이 표시된 경우 “원문 보기”로 원문을 확인할 수 있습니다.',
            },
            {
              en: 'Do not rely on a translation alone for decisions about visas or immigration, employment, housing contracts or payments, or legal or tax matters. Check the original and consult a qualified professional (see Section 12).',
              ko: '비자·이민, 취업, 주거 계약·지급, 법률·세무 관련 결정을 번역문에만 의존해서 내리지 마십시오. 원문을 확인하고 자격 있는 전문가와 상담하십시오(제12조 참고).',
            },
            {
              en: 'The Company may choose not to translate some Content (for example, suspected spam, advertising, harmful Content, or Content containing personal contact details), may show Content untranslated until a translation is available, and may correct or remove translations at any time.',
              ko: '회사는 일부 게시물(예: 스팸·광고·유해 게시물 또는 개인 연락처가 포함된 게시물로 의심되는 경우)을 번역하지 않을 수 있고, 번역문이 준비될 때까지 원문만 표시하거나 해당 언어 화면에 표시하지 않을 수 있으며, 언제든지 번역문을 수정·삭제할 수 있습니다.',
            },
            {
              en: 'These Terms, the Privacy Policy, and other legal notices are governed by their English versions as described in the language notice above.',
              ko: '본 약관, 개인정보처리방침 및 기타 법적 고지는 위 언어 고지에 따라 영문본이 기준입니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'community-rules',
      title: '7. Community Rules and Prohibited Conduct',
      titleKo: '7. 커뮤니티 이용 규칙 및 금지행위',
      blocks: [
        {
          type: 'p',
          en: 'The Services depend on mutual respect and safe information sharing. You must not engage in the following. Violations may result in Content removal, feature limits, account suspension or termination, and referral to authorities. These rules apply to Content in every language, and the Company may use translations, including automated translations, to review and moderate Content.',
          ko: '서비스는 상호 존중과 안전한 정보 공유를 전제로 합니다. 이용자는 다음 행위를 해서는 안 됩니다. 위반 시 게시물 삭제, 기능 제한, 계정 정지·해지, 수사기관 신고 등 조치가 취해질 수 있습니다. 이 규칙은 모든 언어로 작성된 게시물에 적용되며, 회사는 게시물 검토·관리에 번역문(자동 번역 포함)을 이용할 수 있습니다.',
        },
        {
          type: 'p',
          en: 'There is zero tolerance for objectionable content or abusive users. Objectionable content (including hate speech, harassment, sexual content, threats, and slurs) is removed, and the accounts that post it or that abuse other Users may be suspended or terminated without prior notice.',
          ko: '회사는 불쾌하거나 부적절한 콘텐츠와 다른 이용자를 괴롭히는 이용자를 절대 용납하지 않습니다(무관용 원칙). 혐오 표현, 괴롭힘, 성적 콘텐츠, 위협, 욕설·비하 표현 등 부적절한 콘텐츠는 삭제되며, 이를 게시하거나 다른 이용자를 괴롭힌 계정은 사전 통지 없이 이용 정지 또는 해지될 수 있습니다.',
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
              en: 'Abusing reporting, blocking, verification, Misaeng Points, Coffee Chat, or Premium systems (including sharing or reselling Premium access or codes)',
              ko: '신고·차단·인증·미생 포인트·커피챗·Premium 제도를 악의적으로 남용하는 행위(Premium 이용 권한이나 코드를 공유·재판매하는 행위 포함)',
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
      title: '8. Special Notice for the Anonymous Board',
      titleKo: '8. 익명게시판에 관한 특별 고지',
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
              en: 'Anonymous posts and comments created after this feature was introduced (November 2026) show the kind of the author’s verification badge — “Student” (school verified), “Workplace verified,” or “Parent” — so that readers can judge the context. They never show the author’s nickname or school name. Anonymous posts and comments created before this change remain fully anonymous and do not show a badge kind.',
              ko: '이 기능이 도입된 뒤(2026년 11월) 작성되는 익명 글·댓글에는 읽는 사람이 맥락을 판단할 수 있도록 작성자의 인증 배지 종류(“학생”(학교 인증), “직장인 인증”, “학부모”)가 표시됩니다. 작성자의 닉네임이나 학교 이름은 표시되지 않습니다. 이 변경 전에 작성된 익명 글·댓글은 지금처럼 완전한 익명으로 남으며 배지 종류도 표시되지 않습니다.',
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
      title: '9. Housing, Roommate Posts, Brokerage Roles, and Fees',
      titleKo: '9. 하우징·룸메이트·중개 역할 및 수수료',
      blocks: [
        {
          type: 'p',
          en: '9.1 Two different roles on the Services. Misaeng NYC includes both (a) community information and peer-to-peer posts (for example roommate/sublet boards and User-generated tips) and (b) housing-related activity that may involve New York–licensed real estate professionals affiliated with the Company and/or a partner brokerage (which may include Fact Real Estate or another licensed brokerage). These roles are not the same, and the applicable duties depend on the facts of each interaction.',
          ko: '9.1 서비스상의 두 가지 역할. Misaeng NYC에는 (a) 커뮤니티 정보·개인간 게시(룸메이트·서블렛 게시판, 이용자 팁 등)와 (b) 회사 및/또는 파트너 브로커리지(Fact Real Estate 등 면허 브로커리지 포함 가능)에 소속·제휴된 뉴욕주 공인 부동산 전문가의 하우징 관련 활동이 함께 있을 수 있습니다. 역할이 동일하지 않으며, 각 상호작용의 사실에 따라 적용되는 의무가 달라집니다.',
        },
        {
          type: 'p',
          en: '9.2 Peer-to-peer and informational use. For roommate/sublet posts, community discussions, and other User-to-User communications where no licensed brokerage representation is offered or accepted, the Company is not your landlord, tenant, escrow agent, or guarantor, and does not automatically become your real estate broker or salesperson solely because content appears on the Services. You must independently verify counterparties, terms, payment requests, identity, and authority. Be especially careful with high-risk payment methods such as advance deposits, cash wires, gift cards, or cryptocurrency, and report suspicious requests.',
          ko: '9.2 개인간·정보성 이용. 룸메이트·서블렛 게시, 커뮤니티 토론 등 면허 중개 대리가 제안·수락되지 않은 이용자 간 소통에 대해, 회사는 귀하의 임대인·임차인·에스크로·보증인이 아니며, 콘텐츠가 서비스에 게시되었다는 사실만으로 자동으로 귀하의 부동산 브로커·세일즈퍼슨이 되지 않습니다. 상대방·조건·입금 요청·신분·권한은 스스로 확인해야 합니다. 선입금·현금 송금·기프트카드·암호화폐 등 위험 결제수단에 특히 주의하고, 의심 요청은 신고해 주세요.',
        },
        {
          type: 'p',
          en: '9.3 Licensed brokerage activity and agency disclosure. Where a New York–licensed real estate salesperson or broker affiliated with the Company or a partner brokerage introduces, shows, negotiates, or otherwise assists with a rental or related real-estate transaction, an agency or brokerage relationship may arise under New York law. New York requires clear disclosure of agency relationships in many residential real-estate dealings (see, among other authorities, N.Y. Real Property Law §443 and related Department of State brokerage rules and forms). In those cases:',
          ko: '9.3 면허 중개 활동 및 대리관계 공시. 회사 또는 파트너 브로커리지에 소속·제휴된 뉴욕주 공인 부동산 세일즈퍼슨·브로커가 임대 등 부동산 거래의 소개·쇼잉·협상·지원을 하는 경우, 뉴욕주 법률에 따른 대리·중개 관계가 성립할 수 있습니다. 뉴욕주는 많은 주거용 부동산 거래에서 대리관계의 명확한 공시를 요구합니다(예: N.Y. Real Property Law §443 및 관련 Department of State 중개 규정·양식). 이 경우:',
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
          en: '9.4 Broker fees, “no-broker-fee” labels, and New York City rules (including the FARE Act). Labels such as “no broker fee,” “OP,” owner-pays, or similar fee badges on listings are informational summaries based on data available at the time of posting. They are not a warranty that you will never pay any fee, concession charge, or other cost. New York City’s Fairness in Apartment Rental Expenses (FARE) Act and related rules have changed how broker fees may be charged and disclosed in many rental situations. Fee responsibility can depend on who engaged the broker, the listing’s compensation structure, and applicable law at the time of your deal. Always confirm fee allocation in writing before you tour, apply, or sign. Marketing phrases about “broker-fee-free” inventory must be read together with then-current NYC law and the specific listing/brokerage disclosures—not as a blanket legal conclusion for every property.',
          ko: '9.4 브로커 수수료, “중개비 무료” 라벨, 뉴욕시 규정(FARE Act 포함). 매물의 “no broker fee”, “OP”, 소유자 부담, 유사 수수료 배지는 게시 시점 데이터에 따른 정보 요약이며, 귀하가 어떠한 수수료·비용도 내지 않는다는 보증이 아닙니다. 뉴욕시 Fairness in Apartment Rental Expenses(FARE) Act 및 관련 규정으로 많은 임대 상황에서 브로커 수수료의 청구·공시 방식이 달라졌습니다. 수수료 부담은 누가 브로커를 고용했는지, 리스팅 보수 구조, 거래 시점의 적용법에 따라 달라질 수 있습니다. 투어·신청·계약 전에 서면으로 수수료 배분을 확인하세요. “broker-fee-free” 등 마케팅 문구는 당시 NYC 법과 해당 매물/중개 공시와 함께 읽어야 하며, 모든 매물에 대한 일률적 법적 결론이 아닙니다.',
        },
        {
          type: 'note',
          en: 'Nothing in these Terms is a substitute for the agency, compensation, or other disclosures required by New York law in a licensed real-estate transaction. If you are unsure whether a licensed professional is representing you, ask before sharing personal or financial information or paying any fee.',
          ko: '본 약관의 어떤 문구도 면허 부동산 거래에서 뉴욕주법이 요구하는 대리·보수 등 공시를 대체하지 않습니다. 면허 전문가가 귀하를 대리하는지 불확실하면, 개인·금융 정보를 공유하거나 수수료를 지급하기 전에 확인해 주세요.',
        },
      ],
    },
    {
      id: 'marketplace',
      title: '10. Marketplace (Used-Goods Trading)',
      titleKo: '10. 중고거래',
      blocks: [
        {
          type: 'p',
          en: '10.1 What the Marketplace is. The Marketplace lets Members list personal items (for example furniture, electronics, household goods, clothing, books, and tickets or gift cards), including moving sales and free giveaways, and lets other Members contact the seller through in-Service inquiry messages. A listing may include a title, a description, up to six photos, a category, an asking price (or “free”), the payment methods the seller accepts (cash, Zelle, Venmo, or other), the ZIP code of the trade area, and a trade status. Listings may be shown on Misaeng NYC and Ellieo in their original language or in translation (see Section 6).',
          ko: '10.1 중고거래의 의미. 중고거래에서 회원은 개인 물품(예: 가구, 전자기기, 생활용품, 의류·잡화, 책·교재, 티켓·기프트)을 무빙세일·무료 나눔을 포함하여 등록할 수 있고, 다른 회원은 서비스 내 문의 메시지로 판매자에게 연락할 수 있습니다. 등록 글에는 제목, 설명, 사진(최대 6장), 카테고리, 희망 가격(또는 “나눔”), 판매자가 받는 결제 방법(현금, Zelle, Venmo, 그 외), 거래 지역의 ZIP 코드, 거래 상태가 포함될 수 있습니다. 등록 글은 원문 또는 번역문으로 Misaeng NYC와 Ellieo에 표시될 수 있습니다(제6조 참고).',
        },
        {
          type: 'p',
          en: '10.2 Misaeng is only a venue. The Company only provides a place where Users can find each other and is not a party to any transaction between Users. The Company is not the seller, buyer, agent, broker, or escrow for any item. The Company does not process or collect payments, hold funds, or offer buyer or seller protection; does not inspect, authenticate, store, deliver, or ship items; and does not guarantee any item, listing, User, or payment—including the existence, quality, safety, legality, condition, or authenticity of an item, the accuracy of a listing, the identity, intentions, or ability to pay or deliver of any User, or that a transaction will be completed. Payments (including through Zelle, Venmo, or other apps) are made directly between Users through services the Company does not control, and many of them cannot be reversed.',
          ko: '10.2 미생은 거래의 장소일 뿐입니다. 회사는 이용자들이 서로를 찾을 수 있는 공간을 제공할 뿐이며, 이용자 간 거래의 당사자가 아닙니다. 회사는 어떤 물품에 대해서도 판매자·구매자·대리인·중개인·에스크로가 아닙니다. 회사는 결제를 처리·수령하거나 대금을 보관하지 않고, 구매자·판매자 보호를 제공하지 않으며, 물품을 검수·진품 확인·보관·전달·배송하지 않습니다. 또한 물품, 등록 글, 이용자, 결제에 관하여 어떠한 보증도 하지 않습니다(물품의 실재·품질·안전성·적법성·상태·진위, 등록 글의 정확성, 이용자의 신원·의도·지급 또는 인도 능력, 거래의 성사 등을 포함). 결제(Zelle, Venmo 또는 다른 앱을 통한 결제 포함)는 회사가 관리하지 않는 서비스를 통해 이용자 간에 직접 이루어지며, 상당수는 되돌릴 수 없습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Sellers are responsible for having the right to sell each item and for its legality, for describing its condition, defects, and price accurately with genuine photos, and for keeping the listing’s status up to date.',
              ko: '판매자는 물품을 판매할 권리와 그 적법성, 상태·하자·가격을 실제 사진과 함께 정확하게 기재할 책임, 그리고 등록 글의 거래 상태를 최신으로 유지할 책임을 집니다.',
            },
            {
              en: 'Buyers are responsible for checking items in person before paying and for their own decision to trade.',
              ko: '구매자는 결제 전에 물품을 직접 확인하고, 거래 여부를 스스로 판단할 책임을 집니다.',
            },
            {
              en: 'Buyers and sellers are each responsible for arranging meetups, payment, and pickup or delivery, and for complying with applicable laws, including tax, reporting, consumer-protection, product-safety, and recall laws.',
              ko: '구매자와 판매자는 각자 만남, 결제, 수령·전달을 조율할 책임과 세금·신고·소비자 보호·제품 안전·리콜 관련 법령 등 적용 법령을 준수할 책임을 집니다.',
            },
            {
              en: 'Any dispute about an item, a meetup, or a payment is between the buyer and the seller. The Company may, but is not obligated to, review reports or help resolve a dispute, and does not provide refunds or compensation for transactions between Users.',
              ko: '물품·만남·결제에 관한 분쟁은 구매자와 판매자 사이의 문제입니다. 회사는 신고를 검토하거나 분쟁 해결을 도울 수 있으나 그럴 의무는 없으며, 이용자 간 거래에 대해 환불이나 보상을 제공하지 않습니다.',
            },
          ],
        },
        {
          type: 'p',
          en: '10.3 Prohibited items. You may not list, offer, request, or trade the following on the Marketplace. The Company may add to this list in on-Service guidelines.',
          ko: '10.3 거래 금지 물품. 중고거래에서 다음 물품을 등록·제안·요청·거래해서는 안 됩니다. 회사는 서비스 화면의 가이드라인으로 이 목록을 추가할 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Weapons, including firearms, firearm parts and accessories, ammunition, explosives, fireworks, and knives or self-defense devices (such as stun guns or pepper spray) that are restricted where the trade takes place',
              ko: '무기: 총기, 총기 부품·액세서리, 탄약, 폭발물, 폭죽, 거래 장소에서 규제되는 칼·호신용품(전기충격기, 페퍼 스프레이 등)',
            },
            {
              en: 'Illegal drugs, cannabis and cannabis products (including edibles and THC vapes), drug paraphernalia, and prescription or controlled medications',
              ko: '불법 약물, 대마 및 대마 제품(에디블·THC 베이프 포함), 마약 용품, 처방약·규제 의약품',
            },
            {
              en: 'Alcohol, tobacco, e-cigarettes, vapes, and other nicotine products',
              ko: '주류, 담배, 전자담배, 베이프 및 기타 니코틴 제품',
            },
            {
              en: 'Recalled or unsafe products, and hazardous materials (such as flammable, toxic, or corrosive chemicals and gas cylinders)',
              ko: '리콜되었거나 안전하지 않은 제품, 위험물(인화성·독성·부식성 화학물질, 가스통 등)',
            },
            {
              en: 'Stolen goods, counterfeit or replica goods, and items that infringe intellectual property rights',
              ko: '도난품, 위조품·모조품, 지식재산권을 침해하는 물품',
            },
            {
              en: 'Live animals, including pets',
              ko: '반려동물을 포함한 살아 있는 동물',
            },
            {
              en: 'Adult or sexual products and content',
              ko: '성인용품 및 성적 콘텐츠',
            },
            {
              en: 'Personal information, accounts, or credentials (such as social-media, email, streaming, or game accounts and verification codes), identity documents, and forged or fake documents',
              ko: '개인정보, 계정·로그인 정보(SNS·이메일·스트리밍·게임 계정, 인증번호 등), 신분증, 위조·허위 서류',
            },
            {
              en: 'Tickets resold above face value where that is prohibited, or otherwise in violation of applicable ticket-resale laws',
              ko: '액면가를 초과한 재판매가 금지된 경우의 티켓, 기타 적용되는 티켓 재판매 법령을 위반하는 티켓',
            },
            {
              en: 'Items whose sale requires a license, permit, or prescription that the seller does not hold',
              ko: '판매에 면허·허가·처방이 필요하지만 판매자가 이를 갖추지 않은 물품',
            },
            {
              en: 'Services, jobs, housing, rentals, or sublets (use the applicable boards instead), and currency exchange, money transfers, or other financial products',
              ko: '서비스, 구인·구직, 주거·임대·서블렛(해당 게시판 이용), 환전·송금 대행 및 기타 금융상품',
            },
            {
              en: 'Any other item that is illegal to sell, buy, or possess where the trade takes place',
              ko: '기타 거래 장소에서 판매·구매·소지가 불법인 물품',
            },
          ],
        },
        {
          type: 'p',
          en: '10.4 Inquiry messages. Buyers contact sellers through in-Service inquiry messages, and each message is delivered to the other side as a notification. Sending inquiries may require login and student or professional verification, and the Company may limit the number of new inquiries and messages to prevent spam. When a listing is marked sold or deleted, its conversations close and become read only. In inquiry messages, you must not:',
          ko: '10.4 문의 메시지. 구매자는 서비스 내 문의 메시지로 판매자에게 연락하며, 각 메시지는 상대방에게 알림으로 전달됩니다. 문의를 보내려면 로그인과 학생·직장인 인증이 필요할 수 있으며, 회사는 스팸 방지를 위해 새 문의와 메시지 수를 제한할 수 있습니다. 등록 글이 판매완료로 바뀌거나 삭제되면 그 대화는 닫히고 읽기 전용이 됩니다. 문의 메시지에서 다음 행위를 해서는 안 됩니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Harass, threaten, or pressure another User, or send sexual, hateful, or abusive messages',
              ko: '다른 이용자를 괴롭히거나 위협·압박하는 행위, 성적·혐오·모욕적 메시지 전송',
            },
            {
              en: 'Send spam, phishing, or external links or payment pages, or try to move the conversation off the Services to scam or defraud another User',
              ko: '스팸, 피싱, 외부 링크·결제 페이지 전송, 또는 사기를 목적으로 대화를 서비스 밖으로 옮기도록 유도하는 행위',
            },
            {
              en: 'Request advance payments or deposits from someone you have not met, verification codes (such as Google Voice, bank, or email codes), or personal or financial information that the trade does not need',
              ko: '만나지 않은 상대에게 선입금·보증금을 요구하거나, 인증번호(Google Voice·은행·이메일 인증번호 등) 또는 거래에 필요하지 않은 개인·금융 정보를 요구하는 행위',
            },
            {
              en: 'Use information you learn from a conversation for any purpose other than the trade',
              ko: '대화에서 알게 된 정보를 거래 외 목적으로 이용하는 행위',
            },
          ],
        },
        {
          type: 'p',
          en: '10.5 Safe-trading rules and agreement. Before you list an item or contact a seller, the Services may ask you to read and agree to the safe-trading rules shown on screen. Those rules, summarized below, form part of these Terms. Agreeing to or following them does not guarantee a safe trade and does not make the Company responsible for any transaction.',
          ko: '10.5 안전 거래 수칙 및 동의. 물품을 등록하거나 판매자에게 문의하기 전에, 서비스는 화면에 표시되는 안전 거래 수칙을 읽고 동의하도록 요청할 수 있습니다. 아래에 요약된 이 수칙은 본 약관의 일부를 이룹니다. 수칙에 동의하거나 이를 따른다고 해서 안전한 거래가 보장되거나 회사가 거래에 책임을 지게 되는 것은 아닙니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Never send money before you have seen the item. Requests for advance payment are almost always scams, and transfers through Zelle, Venmo, Cash App, and similar apps generally cannot be reversed.',
              ko: '물건을 보기 전에는 절대 돈을 보내지 마세요. 선입금 요구는 거의 다 사기이며, Zelle·Venmo·Cash App 등의 송금은 일반적으로 되돌릴 수 없습니다.',
            },
            {
              en: 'Do not post your phone number, email, messenger ID, social-media handle, or home address. Keep conversations in the in-Service inquiry messages, and be suspicious of requests to move to text or other messaging apps or to open external links or payment pages.',
              ko: '전화번호·이메일·메신저 ID·SNS·집 주소를 공개하지 마세요. 대화는 서비스 내 문의 메시지로만 하고, 문자나 다른 메신저로 옮기자고 하거나 외부 링크·결제 페이지를 보내면 의심하세요.',
            },
            {
              en: 'Never share verification codes (for example Google Voice, bank, or email codes) with anyone.',
              ko: '인증번호(Google Voice·은행·이메일 인증번호 등)는 누구에게도 알려 주지 마세요.',
            },
            {
              en: 'Meet in daylight in a busy public place, such as a café, a subway station, or a police station’s safe exchange zone. If you trade at a home, bring someone with you.',
              ko: '밝은 시간에 카페, 지하철역, 경찰서 앞 Safe Exchange Zone 등 사람이 많은 공공장소에서 만나세요. 집에서 거래한다면 지인과 함께하세요.',
            },
            {
              en: 'Check electronics in person before paying, including power, function, serial number, and that activation locks such as iCloud/Find My are removed.',
              ko: '전자기기는 결제 전에 현장에서 전원·작동, 시리얼 번호, iCloud/Find My 등 활성화 잠금 해제 여부를 확인하세요.',
            },
            {
              en: 'Be suspicious of prices far below market value, pressure to decide quickly, and requests for shipping or third-party pickup. Refuse checks, money orders, gift-card payments, and “I overpaid, please refund the difference” requests.',
              ko: '시세보다 지나치게 싼 가격, 급한 결정 요구, 배송·대리 수령 요청은 의심하세요. 수표, Money order, 기프트카드 결제, “더 보냈으니 차액을 돌려 달라”는 요청은 거절하세요.',
            },
            {
              en: 'Report suspicious listings, Users, or conversations in the Services. If you are the victim of a crime, also contact the police (311 for non-emergencies in New York City, 911 in an emergency) and the FTC at reportfraud.ftc.gov.',
              ko: '수상한 등록 글·이용자·대화는 서비스에서 신고하세요. 범죄 피해를 입었다면 경찰(뉴욕시 비긴급 311, 긴급 911)과 FTC(reportfraud.ftc.gov)에도 신고하세요.',
            },
          ],
        },
        {
          type: 'p',
          en: '10.6 Trade area and listing status. A listing’s trade area is shown only as a 5-digit ZIP code and an approximate area on a map, not an exact address; agree on the meeting place in the inquiry conversation. Sellers must keep each listing’s status accurate: “selling” (shown in lists and open to inquiries), “reserved” (a trade has been arranged, but inquiries are still accepted), or “sold” (hidden from lists, and its conversations close). Prices, status, and availability are set by the seller and may change at any time.',
          ko: '10.6 거래 지역 및 거래 상태. 등록 글의 거래 지역은 정확한 주소가 아니라 5자리 ZIP 코드와 지도상의 대략적인 지역으로만 표시됩니다. 만날 장소는 문의 대화에서 정하세요. 판매자는 각 등록 글의 거래 상태를 정확하게 유지해야 합니다: “판매중”(목록에 표시되고 누구나 문의 가능), “예약중”(거래 약속이 잡혔으나 문의는 계속 받음), “판매완료”(목록에서 숨겨지고 문의 대화가 닫힘). 가격·상태·거래 가능 여부는 판매자가 정하며 언제든 바뀔 수 있습니다.',
        },
        {
          type: 'p',
          en: '10.7 Reports, blocks, and enforcement. You can report a listing or an inquiry conversation and block another User. When you report a conversation, its most recent messages are sent to the Company with your report for review. Blocking a User stops messages in both directions and removes the conversation from your list. The Company may, at its discretion and without prior notice, remove or hide listings, close conversations, limit Marketplace features, or suspend or terminate accounts that violate these Terms or that it reasonably believes create a risk of fraud or harm, and may cooperate with law enforcement (see Section 18).',
          ko: '10.7 신고, 차단 및 조치. 이용자는 등록 글이나 문의 대화를 신고하고 다른 이용자를 차단할 수 있습니다. 대화를 신고하면 그 대화의 최근 메시지가 신고 내용과 함께 회사에 전달되어 검토됩니다. 이용자를 차단하면 서로 메시지를 보낼 수 없고 해당 대화는 목록에서 사라집니다. 회사는 본 약관을 위반하거나 사기·피해 위험이 있다고 합리적으로 판단되는 등록 글을 재량에 따라 사전 통지 없이 삭제·숨김 처리하거나, 대화를 닫거나, 중고거래 기능을 제한하거나, 계정을 이용 정지·해지할 수 있으며, 수사기관에 협조할 수 있습니다(제18조 참고).',
        },
        {
          type: 'note',
          en: 'The Company does not screen Users or listings in advance and does not mediate, refund, or compensate for transactions between Users. To the maximum extent permitted by law, the Company is not liable for any loss, injury, or damage arising from items, listings, meetups, payments, or other dealings between Users (see Sections 20 and 21).',
          ko: '회사는 이용자나 등록 글을 사전에 심사하지 않으며, 이용자 간 거래를 중재·환불·보상하지 않습니다. 관련 법령이 허용하는 최대 범위에서, 회사는 이용자 간의 물품·등록 글·만남·결제 및 기타 거래로 인해 발생한 손실·상해·손해에 대해 책임지지 않습니다(제20조 및 제21조 참고).',
        },
      ],
    },
    {
      id: 'fair-housing',
      title: '11. Fair Housing and Equal Opportunity',
      titleKo: '11. 공정주거 및 평등한 기회',
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
      title: '12. Visa, Career, Legal, and Tax Information — Not Advice',
      titleKo: '12. 비자·취업·법률·세무 정보 — 조언이 아님',
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
              en: 'Coffee Chats, Career Questions, mentoring, or advisory connections (including those offered as Misaeng Points rewards) do not, unless expressly stated otherwise, mean the Company is substituting for licensed professional advice or guaranteeing outcomes.',
              ko: '커피챗·커리어 질문·멘토링·자문 연계(미생 포인트 보상으로 제공되는 것 포함) 또한, 별도 고지가 없는 한 회사의 전문 자격 대행이나 결과 보장을 의미하지 않습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'points',
      title: '13. Misaeng Points',
      titleKo: '13. 미생 포인트',
      blocks: [
        {
          type: 'p',
          en: 'Misaeng Points are an in-Service rewards program. You may earn points through activity (for example reviews, comments, the onboarding quiz, and inviting friends or parents) and use them for features and rewards the Company offers, such as Career Questions, boosting a roommate listing, or reward applications. The Company may award, adjust, reclaim, or expire points under its policies, limits, and calculation methods, which are described in the Misaeng Points guide in the Services.',
          ko: '미생 포인트는 서비스 내 보상 프로그램입니다. 후기·댓글 작성, 온보딩 퀴즈, 친구·부모님 초대 등 활동으로 포인트를 적립하고, 커리어 질문, 룸메이트 글 끌어올리기, 보상 신청 등 회사가 제공하는 기능·보상에 사용할 수 있습니다. 회사는 서비스 내 미생 포인트 가이드에 안내된 정책·한도·산정 방식에 따라 포인트를 부여·조정·회수·소멸시킬 수 있습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Points have no cash value. They cannot be bought, sold, refunded, withdrawn, exchanged for money, inherited, transferred, or pledged, except where the Company expressly allows.',
              ko: '포인트는 현금 가치가 없으며, 회사가 명시적으로 허용한 경우를 제외하고 구매·판매·환불·인출·현금 교환·상속·양도·담보 제공을 할 수 없습니다.',
            },
            {
              en: 'Points used for a feature (for example a Career Question) may be returned if the request expires or is declined, as shown in the Services when you use them.',
              ko: '기능(예: 커리어 질문)에 사용한 포인트는 요청이 만료되거나 거절되면 사용 시 서비스에 안내된 대로 돌려받을 수 있습니다.',
            },
            {
              en: 'If fraudulent earning is found (multiple accounts, fake posts, manipulated engagement, etc.), points and related rewards may be canceled and accounts sanctioned.',
              ko: '부정 적립(다중 계정, 허위 게시, 조작된 참여 등)이 확인되면 포인트 및 관련 보상이 취소되고 계정이 제재될 수 있습니다.',
            },
            {
              en: 'Reward applications and fulfillment may be delayed, changed, or declined due to scheduling, partner constraints, or operating policy.',
              ko: '보상 신청·이행은 일정·파트너 사정·운영 정책에 따라 지연·변경·거절될 수 있습니다.',
            },
            {
              en: 'Unused points are lost when you delete your account, and if the Services end or the program changes, unused points create no compensation obligation.',
              ko: '계정을 삭제하면 남은 포인트는 사라지며, 서비스 종료 또는 프로그램 변경 시 미사용 포인트에 대한 보상 의무가 발생하지 않습니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'premium',
      title: '14. Misaeng Premium (Paid Subscription)',
      titleKo: '14. 미생 Premium(유료 구독)',
      blocks: [
        {
          type: 'p',
          en: '14.1 What Premium is. Premium is an optional paid subscription that adds information features to the Services, such as visa sponsorship history by company, base salary by role and area, company visa policies, and more frequent new-job alerts. The features included are described on the Premium page at the time of purchase and may be improved or changed over time. Premium information is drawn from public sources (such as U.S. Department of Labor data) and is provided for general information only, not as legal, immigration, or career advice (see Section 12).',
          ko: '14.1 Premium이란. Premium은 회사별 비자 스폰서 이력, 직무·지역별 기본급, 회사 비자 정책, 더 잦은 새 채용 공고 알림 등 정보 기능을 추가하는 선택형 유료 구독입니다. 포함되는 기능은 구매 시점의 Premium 페이지에 안내되며, 이후 개선·변경될 수 있습니다. Premium 정보는 미국 노동부 자료 등 공개 자료를 바탕으로 한 일반 정보이며, 법률·이민·진로 자문이 아닙니다(제12조 참고).',
        },
        {
          type: 'p',
          en: '14.2 Plans, prices, and payment. Premium is offered as a monthly, 3-month, or yearly plan at the prices shown before you buy, plus any applicable tax. If you buy on the web, payment is processed by Stripe, Inc. If you buy in the iOS app, payment is processed by Apple through your Apple ID under Apple’s terms. Prices in the app may differ from prices on the web.',
          ko: '14.2 요금제, 가격, 결제. Premium은 월간, 3개월, 연간 요금제로 제공되며, 가격(해당 세금 별도)은 결제 전에 표시됩니다. 웹에서 구매하면 Stripe, Inc.가 결제를 처리하고, iOS 앱에서 구매하면 Apple이 Apple ID를 통해 Apple 약관에 따라 결제를 처리합니다. 앱 내 가격은 웹 가격과 다를 수 있습니다.',
        },
        {
          type: 'p',
          en: '14.3 Free trial. Eligible new subscribers may receive a 7-day free trial, once per account. Unless you cancel before the trial ends, you will be charged the plan price when it ends. On the web we remind you by email before the first charge.',
          ko: '14.3 무료 체험. 대상 신규 구독자는 계정당 1회 7일 무료 체험을 받을 수 있습니다. 체험이 끝나기 전에 해지하지 않으면 체험 종료 시 요금제 가격이 결제됩니다. 웹에서는 첫 결제 전에 이메일로 미리 알려 드립니다.',
        },
        {
          type: 'p',
          en: '14.4 Automatic renewal. YOUR SUBSCRIPTION RENEWS AUTOMATICALLY at the end of each period (every month, every 3 months, or every year) at the same price and for the same period, and you authorize us (or Apple) to charge your payment method on each renewal, until you cancel. We will tell you in advance before a yearly plan renews and before any price change takes effect; a price change applies from your next renewal, and you can cancel before then.',
          ko: '14.4 자동 갱신. 구독은 해지할 때까지 매 기간(매월, 3개월마다, 또는 매년)이 끝날 때 같은 가격과 기간으로 자동 갱신되며, 이용자는 갱신 시마다 회사(또는 Apple)가 결제 수단에 요금을 청구하는 것에 동의합니다. 연간 요금제 갱신 전과 가격 변경 전에는 미리 알려 드리며, 변경된 가격은 다음 갱신부터 적용되고 그 전에 해지할 수 있습니다.',
        },
        {
          type: 'p',
          en: '14.5 How to cancel. You can cancel at any time. Web: “Manage subscription” on the Premium page or My Page. iOS app purchases: iPhone Settings > Apple ID > Subscriptions. Canceling stops the next renewal; you keep Premium until the end of the period you already paid for.',
          ko: '14.5 해지 방법. 언제든 해지할 수 있습니다. 웹: Premium 페이지 또는 마이페이지의 ‘구독 관리’. iOS 앱 구매: iPhone 설정 > Apple ID > 구독. 해지하면 다음 갱신이 멈추며, 이미 결제한 기간이 끝날 때까지 Premium을 이용할 수 있습니다.',
        },
        {
          type: 'p',
          en: '14.6 Refunds. Refunds for web purchases follow our Subscription & Refund Policy at misaeng.com/premium/policy, which is part of these Terms. In short: a full refund within 7 days of your first payment (once per account) or of a yearly renewal, and no partial refunds after that. Purchases made through the App Store are refunded by Apple under its policies.',
          ko: '14.6 환불. 웹 구매의 환불은 본 약관의 일부인 구독·환불 정책(misaeng.com/premium/policy)을 따릅니다. 요약하면, 첫 결제 후 7일 이내(계정당 1회) 또는 연간 요금제 갱신 후 7일 이내에는 전액 환불되며, 그 이후에는 부분 환불이 없습니다. App Store에서 구매한 경우 Apple이 Apple 정책에 따라 환불합니다.',
        },
        {
          type: 'p',
          en: '14.7 Premium codes. Premium codes (for example from a student council or a Misaeng event) can be redeemed only on the website, one at a time, and not while you have a paid subscription. Codes have no cash value, cannot be sold or transferred, and are not refundable. Access from a code ends automatically at the end of its period, and no payment is taken.',
          ko: '14.7 Premium 코드. Premium 코드(예: 학생회나 미생 이벤트에서 받은 코드)는 웹사이트에서만 한 번에 하나씩 사용할 수 있으며, 유료 구독 중에는 사용할 수 없습니다. 코드는 현금 가치가 없고 판매·양도할 수 없으며 환불되지 않습니다. 코드로 받은 이용 기간은 끝나면 자동으로 종료되며 결제가 이루어지지 않습니다.',
        },
        {
          type: 'p',
          en: '14.8 Your account. Premium is personal to your account and may not be shared. Premium bought on the web, in the app, or with a code works on the same account across the website and apps. If you delete your account, web subscriptions are canceled at that time without a refund for the remaining period (unless the refund policy applies); App Store subscriptions must be canceled by you in your Apple ID settings. If your account is terminated for violating these Terms, Premium ends without a refund to the extent permitted by law.',
          ko: '14.8 계정. Premium은 본인 계정 전용이며 공유할 수 없습니다. 웹·앱·코드로 이용하는 Premium은 같은 계정이면 웹사이트와 앱에서 모두 적용됩니다. 계정을 삭제하면 웹 구독은 그 시점에 해지되며 남은 기간은 환불되지 않습니다(환불 정책이 적용되는 경우 제외). App Store 구독은 이용자가 Apple ID 설정에서 직접 해지해야 합니다. 본 약관 위반으로 계정이 해지되면, 법령이 허용하는 범위에서 Premium은 환불 없이 종료됩니다.',
        },
        {
          type: 'p',
          en: '14.9 Premium paid by a parent. A parent account may buy Premium for a linked child (on the web, or in the app through the parent’s Apple ID or Google Play account). The parent is the payer and the subscriber for billing purposes, and the child is the member who receives Premium. Sections 14.2 to 14.6 apply to the parent: the subscription renews automatically and is charged to the parent’s payment method until the parent cancels; the parent receives the renewal and trial reminders and manages or cancels the subscription (web: “Manage subscription” in My Page > Children; App Store or Google Play: the parent’s store settings); and refunds under our policy are paid to the parent’s payment method, after which the child’s Premium ends immediately. A parent cannot buy for a child who already has their own paid subscription or whose Premium another parent already pays for, and a child whose Premium a parent pays for cannot buy their own. If the parent and child are unlinked (by either side) or either account is deleted, automatic renewal stops and the child keeps Premium until the end of the period already paid; we stop web and Google Play renewals ourselves, but App Store subscriptions can only be canceled by the parent in their Apple ID settings, and we will tell the parent how.',
          ko: '14.9 학부모가 결제하는 Premium. 학부모 계정은 연결된 자녀의 Premium을 구매할 수 있습니다(웹에서, 또는 앱에서 학부모의 Apple ID나 Google Play 계정으로). 결제상 결제자·구독자는 학부모이고, Premium을 받는 회원은 자녀입니다. 제14.2조부터 제14.6조는 학부모에게 적용됩니다. 구독은 학부모가 해지할 때까지 자동 갱신되어 학부모의 결제 수단으로 청구되고, 갱신·무료 체험 종료 안내는 학부모가 받으며, 구독 관리·해지도 학부모가 합니다(웹: 마이페이지 > 자녀의 ‘구독 관리’, App Store·Google Play: 학부모의 스토어 설정). 정책에 따른 환불금은 학부모의 결제 수단으로 지급되며, 환불되면 자녀의 Premium은 즉시 종료됩니다. 자녀가 이미 직접 유료 구독 중이거나 다른 학부모가 이미 결제 중인 경우에는 구매할 수 없으며, 학부모가 결제 중인 자녀는 따로 구매할 수 없습니다. 어느 쪽이든 연결을 끊거나 어느 한 계정이 삭제되면 자동 갱신이 멈추고, 자녀는 이미 결제된 기간이 끝날 때까지 Premium을 이용합니다. 웹과 Google Play 갱신은 회사가 직접 중지하지만, App Store 구독은 학부모가 Apple ID 설정에서만 해지할 수 있으며 회사는 그 방법을 학부모에게 안내합니다.',
        },
        {
          type: 'p',
          en: '14.10 Parent’s 14-day Premium and updates. When a parent buys Premium for a child, the parent’s own account also gets Premium for 14 days from the purchase (including the start of a free trial), at no extra charge; it ends early if that purchase is refunded or revoked, and it has no cash value. For the same 14 days the parent may receive a short daily update by push and email with platform-wide counts only (such as new job postings and visa news), never the child’s activity; the parent can turn it off at any time.',
          ko: '14.10 학부모의 14일 Premium과 소식. 학부모가 자녀의 Premium을 구매하면, 구매일(무료 체험 시작 포함)부터 14일 동안 학부모 본인 계정도 추가 요금 없이 Premium을 이용할 수 있습니다. 해당 구매가 환불되거나 취소되면 일찍 종료되며, 현금 가치는 없습니다. 같은 14일 동안 학부모는 서비스 전체의 집계 수치(새 채용 공고, 비자 소식 수 등)만 담은 짧은 소식을 푸시와 이메일로 매일 받을 수 있으며, 자녀의 활동은 포함되지 않습니다. 학부모는 언제든 이 소식을 끌 수 있습니다.',
        },
      ],
    },
    {
      id: 'agent-credits',
      title: '14A. Licensed Agent Accounts, Credits, and Paid Listings',
      titleKo: '14A. 라이선스 에이전트 계정, 크레딧 및 유료 매물',
      blocks: [
        {
          type: 'p',
          en: 'This Section applies to Misaeng’s Licensed Agent accounts. New York real-estate licensees may apply to post housing listings on Misaeng. Licensed Agent status on Misaeng is reviewed and granted separately from any other service of the Company. Misaeng credits (“Credits”) are a prepaid balance used only for Licensed Agent listings and Premium placement on Misaeng. They are separate from Misaeng Points (Section 13) and from credits on any other service, and can never be converted into or from them.',
          ko: '본 조는 미생의 라이선스 에이전트 계정에 적용됩니다. 뉴욕주 부동산 면허 소지자는 미생에 매물을 게시하기 위해 신청할 수 있으며, 미생의 라이선스 에이전트 자격은 회사의 다른 서비스와 별도로 심사·부여됩니다. 미생 크레딧(이하 “크레딧”)은 미생의 라이선스 에이전트 매물과 Premium 노출에만 쓰이는 선불 잔액으로, 미생 포인트(제13조) 및 다른 서비스의 크레딧과 별개이며 서로 전환할 수 없습니다.',
        },
        {
          type: 'ul',
          items: [
            {
              en: 'Verification. To apply, you provide your NY license number, license type, name as on the license, brokerage, business contact, and photos of your license or pocket card, a government ID, and a selfie. Staff review them manually against the New York Department of State record; we do not create face templates or use automated facial recognition. The photos are kept in private storage, seen only by authorized staff, and deleted 30 days after the decision (see the Privacy Policy). Status ends when the license expires.',
              ko: '인증. 신청 시 뉴욕 면허 번호, 면허 종류, 면허상 이름, 소속 브로커리지, 업무 연락처와 함께 면허증(또는 포켓 카드), 정부 발급 신분증, 셀카 사진을 제출합니다. 직원이 뉴욕주 국무부(DOS) 기록과 수동으로 대조하며, 얼굴 템플릿을 만들거나 자동 얼굴 인식을 사용하지 않습니다. 사진은 비공개 저장소에 보관되어 권한 있는 직원만 볼 수 있고, 결정 후 30일이 지나면 삭제됩니다(개인정보처리방침 참고). 면허가 만료되면 자격도 종료됩니다.',
            },
            {
              en: 'Credit packs. Credits can be obtained only by buying a credit pack (US$1 = 10 Credits), shown with its price, any bonus Credits, and any applicable tax before you pay (for example, US$9.99 for 100 Credits, US$19.99 for 220, US$39.99 for 460, and US$79.99 for 960). Web purchases are processed by Stripe and purchases in the Misaeng iOS app by Apple through the App Store; we do not store your full card number. Bonus Credits from a promotion are part of the purchase they come with. Credits you buy do not expire, and the Company does not give free Credits except staff Credits below.',
              ko: '크레딧 패키지. 크레딧은 크레딧 패키지를 구매해야만 얻을 수 있으며(US$1 = 10크레딧), 결제 전에 가격·보너스 크레딧·적용 세금이 표시됩니다(예: US$9.99에 100크레딧, US$19.99에 220, US$39.99에 460, US$79.99에 960). 웹 결제는 Stripe가, 미생 iOS 앱 내 결제는 App Store를 통해 Apple이 처리하며 회사는 카드 번호 전체를 저장하지 않습니다. 프로모션 보너스 크레딧은 함께 받은 구매의 일부입니다. 구매한 크레딧은 소멸하지 않으며, 아래 스태프 크레딧 외에 회사는 무상 크레딧을 지급하지 않습니다.',
            },
            {
              en: 'Refunds. You may request a full refund of a credit pack bought on the web within 7 days of purchase if none of that pack’s Credits has been used; partial refunds are not available. App Store purchases are refunded by Apple under Apple’s policies. If a purchase is refunded or charged back after some of its Credits were used, the used Credits are taken from your other Credits, and any amount still owed must be paid before you can spend Credits again. Credits cannot be exchanged for cash, transferred, or sold.',
              ko: '환불. 웹에서 구매한 크레딧 패키지는 구매 후 7일 이내이고 그 패키지의 크레딧을 하나도 사용하지 않은 경우에 한해 전액 환불을 요청할 수 있으며, 부분 환불은 제공하지 않습니다. App Store 구매는 Apple의 정책에 따라 Apple이 환불합니다. 크레딧 일부를 사용한 뒤 구매가 환불되거나 지급 거절된 경우 사용한 크레딧만큼 다른 크레딧에서 차감되며, 부족분을 결제하기 전에는 크레딧을 사용할 수 없습니다. 크레딧은 현금으로 바꾸거나 양도·판매할 수 없습니다.',
            },
            {
              en: 'Discounts and bonuses. The Company may offer discounts on packs or listings, or bonus Credits on a purchase, for a limited time or to certain members. Each offer shows its terms before you pay, and offers cannot be combined unless stated.',
              ko: '할인 및 보너스. 회사는 기간 또는 대상 회원을 정해 패키지·매물 할인이나 구매 보너스 크레딧을 제공할 수 있습니다. 각 혜택의 조건은 결제 전에 표시되며, 따로 명시하지 않는 한 중복 적용되지 않습니다.',
            },
            {
              en: 'Company accounts. Accounts of the Company’s staff and affiliated brokerages, identified by a verified company email, use staff Credits provided each month. Staff Credits have no cash value, cannot be bought, refunded or transferred, expire when the next month’s Credits are provided, and are removed when the person leaves, at which time their listings are deleted. Company accounts may hold only a limited share of Premium spots and still need Licensed Agent verification.',
              ko: '회사 계정. 인증된 회사 이메일로 확인되는 회사 직원 및 관계 중개회사의 계정은 매월 제공되는 스태프 크레딧을 사용합니다. 스태프 크레딧은 현금 가치가 없고 구매·환불·양도할 수 없으며, 다음 달 크레딧이 제공될 때 소멸하고, 퇴사 시 삭제되며 그때 해당 계정의 매물도 삭제됩니다. 회사 계정은 Premium 자리 중 일부만 사용할 수 있고, 라이선스 에이전트 인증도 동일하게 받아야 합니다.',
            },
            {
              en: 'Paid listings. Listings are shown for the period you pay for. Premium (Boost) days run from the moment they start and are not refunded if you mark the listing as rented, delete it, or the Company removes it for violating these Terms.',
              ko: '유료 매물. 매물은 결제한 기간 동안 노출됩니다. Premium(Boost) 기간은 시작 시점부터 진행되며, 회원이 거래 완료로 표시하거나 삭제한 경우, 또는 본 약관 위반으로 회사가 삭제한 경우 남은 기간은 환불되지 않습니다.',
            },
            {
              en: 'Your responsibilities. Each listing shows your name, license type, brokerage, and business contact, and any fee the tenant must pay. You are responsible for its accuracy and for complying with New York advertising rules (including 19 NYCRR 175.25), the NYC FARE Act, and fair-housing laws (see Sections 9 and 11). Members can report listings; the Company may remove listings and suspend Licensed Agent status for violations.',
              ko: '회원의 책임. 각 매물에는 회원의 이름, 면허 종류, 브로커리지, 업무 연락처와 임차인이 부담하는 수수료가 표시됩니다. 회원은 매물 정보의 정확성과 뉴욕주 광고 규정(19 NYCRR 175.25 포함), 뉴욕시 FARE Act, 공정주택 법령 준수(제9조, 제11조 참고)에 책임을 집니다. 다른 회원이 매물을 신고할 수 있으며, 위반 시 회사는 매물을 삭제하고 라이선스 에이전트 자격을 정지할 수 있습니다.',
            },
            {
              en: 'Changes. The Company may change prices, packs, and paid features for future purchases. Credits you have already bought keep their value.',
              ko: '변경. 회사는 이후 구매분에 대해 가격·패키지·유료 기능을 변경할 수 있습니다. 이미 구매한 크레딧의 가치는 유지됩니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'ip',
      title: '15. Company Intellectual Property',
      titleKo: '15. 회사의 지식재산권',
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
      title: '16. Third-Party Services and Links',
      titleKo: '16. 제3자 서비스 및 링크',
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
      title: '17. Copyright Complaints and DMCA Designated Agent',
      titleKo: '17. 저작권 침해 신고 및 DMCA Designated Agent',
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
      title: '18. Reports, Monitoring, and Enforcement',
      titleKo: '18. 신고, 모니터링 및 조치',
      blocks: [
        {
          type: 'p',
          en: 'The Company may review Content and accounts based on User reports, automated or manual review, and lawful requests. The Company has no duty to pre- or post-screen all Content and retains discretion over whether, when, and how to act.',
          ko: '회사는 이용자 신고, 자동/수동 검토, 법령상 요청에 따라 콘텐츠와 계정을 검토할 수 있습니다. 회사는 모든 콘텐츠를 사전·사후 검열할 의무가 없으며, 조치 여부·시점·방법에 관한 재량을 보유합니다.',
        },
        {
          type: 'p',
          en: 'You can report any post or comment and block any User directly in the Services. Reported content is hidden from the reporting User right away, content reported by several Users is hidden automatically pending review, and the Company reviews reports within 24 hours, removing objectionable content and suspending or terminating the accounts responsible. The Services also automatically reject posts and comments that contain certain prohibited words.',
          ko: '이용자는 서비스 안에서 모든 게시물·댓글을 신고하고 다른 이용자를 차단할 수 있습니다. 신고한 콘텐츠는 신고한 이용자에게 즉시 보이지 않게 되고, 여러 이용자가 신고한 콘텐츠는 검토 전까지 자동으로 숨겨지며, 회사는 신고를 24시간 이내에 검토하여 부적절한 콘텐츠를 삭제하고 해당 계정을 이용 정지 또는 해지합니다. 또한 서비스는 일부 금지어가 포함된 게시물·댓글의 등록을 자동으로 제한합니다.',
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
      title: '19. Availability, Changes, and Interruptions',
      titleKo: '19. 서비스 제공, 변경 및 중단',
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
      title: '20. Disclaimer of Warranties',
      titleKo: '20. 보증의 부인',
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
      title: '21. Limitation of Liability',
      titleKo: '21. 책임의 제한',
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
      title: '22. Indemnification',
      titleKo: '22. 면책(Indemnification)',
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
      title: '23. Suspension and Termination',
      titleKo: '23. 이용 제한 및 해지',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              en: 'You may stop using the Services at any time and delete your account yourself in the app (Profile > Delete account) or on the website (My Page). Deletion is described in the Privacy Policy. Deleting your account cancels web Premium subscriptions; App Store subscriptions must be canceled in your Apple ID settings.',
              ko: '이용자는 언제든지 서비스 이용을 중단하고, 앱(프로필 > 회원 탈퇴) 또는 웹사이트(마이페이지)에서 직접 계정을 삭제할 수 있습니다. 삭제되는 정보는 개인정보처리방침에 안내되어 있습니다. 계정을 삭제하면 웹 Premium 구독은 해지되며, App Store 구독은 Apple ID 설정에서 직접 해지해야 합니다.',
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
      title: '24. Changes to These Terms',
      titleKo: '24. 약관의 변경',
      blocks: [
        {
          type: 'p',
          en: 'We may revise these Terms from time to time. For new Users, these Terms take effect when you accept them. For existing Members, we ask you to review and accept material changes the next time you open the Services (in the app or on the website), and we may also notify you by email; the revised Terms apply from your acceptance. If you do not agree, you must stop using the Services, and you may delete your account.',
          ko: '회사는 필요 시 본 약관을 개정할 수 있습니다. 신규 이용자에게는 동의한 시점부터 적용됩니다. 기존 회원에게는 중요한 변경이 있으면 다음에 서비스(앱 또는 웹사이트)를 열 때 변경 내용을 확인하고 동의하도록 안내하며, 이메일로도 알릴 수 있습니다. 개정 약관은 동의한 시점부터 적용됩니다. 동의하지 않으면 서비스 이용을 중단해야 하며, 계정을 삭제할 수 있습니다.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: '25. Governing Law; Informal Resolution; Arbitration; Class-Action Waiver',
      titleKo: '25. 준거법, 사전 협의, 중재, 집단소송 포기',
      emphasized: true,
      blocks: [
        {
          type: 'note',
          en: 'IMPORTANT — PLEASE READ. This Section includes a binding individual arbitration agreement and a class-action waiver that affect your legal rights. You may opt out within 30 days as described in Section 25.7.',
          ko: '중요 — 꼭 읽어 주세요. 본 조에는 법적 권리에 영향을 미치는 구속력 있는 개별 중재 합의 및 집단소송 포기 조항이 포함됩니다. 25.7에 따라 30일 이내 옵트아웃할 수 있습니다.',
        },
        {
          type: 'p',
          en: '25.1 Governing law. These Terms and disputes relating to the Services are governed by the laws of the State of New York, United States, without regard to conflict-of-law principles, except that the Federal Arbitration Act governs the interpretation and enforcement of the arbitration agreement below to the fullest extent permitted.',
          ko: '25.1 준거법. 본 약관 및 서비스 관련 분쟁에는 미국 뉴욕주 법률(법 충돌 원칙 제외)이 적용됩니다. 다만 아래 중재 합의의 해석·집행에는 허용되는 최대 범위에서 Federal Arbitration Act가 적용됩니다.',
        },
        {
          type: 'p',
          en: '25.2 Informal resolution first. Before starting arbitration or a lawsuit that is not subject to arbitration, you and the Company agree to try to resolve the dispute informally for at least thirty (30) days after written notice to info@misaeng.com (include your name, the email on your account, a description of the dispute, and the relief sought).',
          ko: '25.2 사전 협의. 중재 또는 중재 대상이 아닌 소송을 시작하기 전에, 귀하와 회사는 info@misaeng.com 으로 서면 통지(이름, 계정 이메일, 분쟁 내용, 구하는 구제) 후 최소 30일간 성실한 비공식 해결을 시도하기로 합니다.',
        },
        {
          type: 'p',
          en: '25.3 Binding individual arbitration. Except for the carve-outs below, you and the Company agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Services will be resolved by binding individual arbitration administered by the American Arbitration Association (“AAA”) under its Consumer Arbitration Rules (or other AAA rules the AAA determines apply). The arbitration will be conducted in English. Hearings may be held in New York County, New York, or by video/phone as the arbitrator allows. Judgment on the award may be entered in any court of competent jurisdiction.',
          ko: '25.3 구속력 있는 개별 중재. 아래 예외를 제외하고, 본 약관 또는 서비스에서 비롯되거나 이와 관련된 모든 분쟁·청구·쟁점은 American Arbitration Association(AAA)의 Consumer Arbitration Rules(또는 AAA가 적용한다고 정하는 규칙)에 따른 구속력 있는 개별 중재로 해결합니다. 중재는 영어로 진행되며, 심리는 뉴욕주 New York County 또는 중재인이 허용하는 화상/전화로 진행될 수 있습니다. 중재판정은 관할 법원에 집행판결을 구할 수 있습니다.',
        },
        {
          type: 'p',
          en: '25.4 Class-action and representative-action waiver. YOU AND THE COMPANY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, PRIVATE ATTORNEY GENERAL, OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person’s claims or otherwise preside over any form of representative proceeding, unless both parties agree in writing after the dispute arises.',
          ko: '25.4 집단·대표소송 포기. 귀하와 회사는 상대방에 대한 청구를 오직 개인 자격으로만 제기할 수 있으며, 집단·집합·병합·사인검찰(private attorney general)·대표 소송의 원고 또는 구성원으로서 제기할 수 없습니다. 분쟁 발생 후 양 당사자가 서면 합의하지 않는 한, 중재인은 복수 개인의 청구를 병합하거나 대표 절차를 주재할 수 없습니다.',
        },
        {
          type: 'p',
          en: '25.5 Carve-outs. This arbitration agreement does not require arbitration of: (a) individual claims in small-claims court within that court’s jurisdiction; (b) claims for injunctive or other equitable relief to stop unauthorized use or infringement of intellectual property; or (c) claims that applicable law prohibits from being subject to pre-dispute arbitration (including certain rights that cannot be waived). Disputes about whether a claim is arbitrable are for the arbitrator to decide, except that a court may decide gateway issues of enforceability of this Section’s class waiver if required by controlling law.',
          ko: '25.5 예외. 다음에는 본 중재 합의가 강제 중재를 요구하지 않습니다: (a) 소액재판소 관할 내 개인 청구; (b) 지식재산의 무단 이용·침해를 막기 위한 금지명령 등 형평법상 구제; (c) 적용법이 사전 중재 합의 대상에서 금지하는 청구(포기할 수 없는 권리 포함). 청구의 중재 가능성에 관한 분쟁은 원칙적으로 중재인이 판단하되, 통제법상 요구되는 경우 본 조의 집단소송 포기 집행 가능성 등 gateway 쟁점은 법원이 판단할 수 있습니다.',
        },
        {
          type: 'p',
          en: '25.6 Licensed real-estate matters. Separate brokerage agreements, agency disclosures, or New York Department of State / licensing procedures may provide additional or different dispute paths for a specific licensed transaction. Those documents control that brokerage relationship. This Section still applies to platform/community disputes that are not governed by such separate brokerage paperwork, to the extent permitted by law.',
          ko: '25.6 면허 부동산 사항. 개별 중개 계약, 대리관계 공시, 또는 뉴욕주 Department of State/라이선스 절차가 특정 면허 거래에 대해 추가·다른 분쟁 경로를 둘 수 있으며, 해당 중개 관계에는 그 서류가 우선합니다. 법이 허용하는 범위에서, 그러한 별도 중개 서류가 규율하지 않는 플랫폼·커뮤니티 분쟁에는 본 조가 계속 적용됩니다.',
        },
        {
          type: 'p',
          en: '25.7 30-day opt-out. You may opt out of this arbitration agreement by emailing info@misaeng.com with subject line “Arbitration Opt-Out” within thirty (30) days after you first accept these Terms (or after this arbitration section first becomes applicable to you). Include your full name and account email. Opting out does not affect other Terms.',
          ko: '25.7 30일 옵트아웃. 본 약관에 처음 동의한 날(또는 본 중재 조항이 처음 적용된 날)부터 30일 이내에 제목 “Arbitration Opt-Out”으로 info@misaeng.com 에 이메일하면 본 중재 합의에서 옵트아웃할 수 있습니다. 성명과 계정 이메일을 포함하세요. 옵트아웃은 나머지 약관에 영향을 주지 않습니다.',
        },
        {
          type: 'p',
          en: '25.8 Court venue if arbitration does not apply. If a claim is not subject to arbitration, exclusive venue lies in the state or federal courts located in New York County, New York, subject to any non-waivable consumer protections.',
          ko: '25.8 중재가 적용되지 않는 경우의 관할. 청구가 중재 대상이 아니면, 소비자의 강행법상 권리를 침해하지 않는 범위에서 뉴욕주 New York County 소재 주·연방 법원이 배타적 관할입니다.',
        },
      ],
    },
    {
      id: 'misc',
      title: '26. Miscellaneous',
      titleKo: '26. 기타',
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
            {
              en: 'The Subscription & Refund Policy (misaeng.com/premium/policy) is part of these Terms.',
              ko: '구독·환불 정책(misaeng.com/premium/policy)은 본 약관의 일부입니다.',
            },
            {
              en: 'If you downloaded the app from the Apple App Store: these Terms are between you and the Company only, not Apple; the Company, not Apple, is solely responsible for the app and its content, maintenance, support, warranty (to the extent not disclaimed), and any claims relating to the app (including product liability, legal or regulatory compliance, and intellectual property claims); Apple has no obligation to provide maintenance or support; your license to use the app is non-transferable and limited to Apple-branded devices you own or control as permitted by the App Store Usage Rules; you represent that you are not located in a country subject to a U.S. Government embargo or designated as a “terrorist supporting” country and are not on any U.S. Government list of prohibited or restricted parties; and Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you.',
              ko: 'Apple App Store에서 앱을 내려받은 경우: 본 약관은 Apple이 아닌 이용자와 회사 사이의 계약입니다. 앱과 그 콘텐츠, 유지보수, 지원, (면책되지 않는 범위의) 보증, 앱 관련 청구(제조물 책임, 법규 준수, 지식재산 침해 청구 포함)에 대한 책임은 Apple이 아닌 회사에 있습니다. Apple은 유지보수·지원 의무가 없습니다. 앱 이용 권한은 양도할 수 없으며, App Store 이용 규칙에 따라 이용자가 소유·관리하는 Apple 기기로 한정됩니다. 이용자는 미국 정부의 금수 조치 대상국이나 “테러 지원국”으로 지정된 국가에 있지 않고, 미국 정부의 거래 금지·제한 명단에 없음을 진술합니다. Apple과 그 자회사는 본 약관의 제3자 수익자로서 본 약관을 이용자에게 집행할 수 있습니다.',
            },
            {
              en: 'If you downloaded the app from Google Play, Google’s terms for Google Play also apply to your use of Google Play, and Google is not a party to these Terms.',
              ko: 'Google Play에서 앱을 내려받은 경우, Google Play 이용에는 Google Play 약관도 적용되며, Google은 본 약관의 당사자가 아닙니다.',
            },
          ],
        },
      ],
    },
    {
      id: 'contact',
      title: '27. Contact',
      titleKo: '27. 문의',
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
