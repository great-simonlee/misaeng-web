/**
 * Onboarding quiz (1.0.7 spec ch.5): 20 very easy multiple-choice questions about Misaeng's real rules and features.
 * Defined here only — the apps and the web read them from the API, and answers are checked on the server.
 * Bump ONBOARDING_QUIZ_VERSION whenever a question, an option or an answer changes.
 */

export const ONBOARDING_QUIZ_VERSION = '2026-11-15'

export type QuizText = { ko: string; en: string; vi: string }
export type OnboardingQuizOption = { id: string; text: QuizText }
export type OnboardingQuizQuestion = {
  id: string
  question: QuizText
  options: OnboardingQuizOption[]
  /** id of the correct option */
  answer: string
  /** one line, shown after the user answers */
  explanation: QuizText
}

export type QuizLocale = 'ko' | 'en' | 'vi'

export const ONBOARDING_QUIZ_QUESTIONS: readonly OnboardingQuizQuestion[] = [
  {
    id: 'q01',
    question: {
      ko: '중고거래에서 처음 보는 판매자가 "먼저 입금해 주면 보내 줄게요"라고 해요. 어떻게 할까요?',
      en: 'A seller you have never met says "Send the money first and I\'ll ship it." What should you do?',
      vi: 'Một người bán bạn chưa từng gặp nói "Chuyển tiền trước rồi tôi gửi hàng". Bạn nên làm gì?',
    },
    options: [
      { id: 'a', text: { ko: '바로 입금한다', en: 'Pay right away', vi: 'Chuyển tiền ngay' } },
      {
        id: 'b',
        text: {
          ko: '선입금하지 않고 직접 만나서 확인 후 거래한다',
          en: "Don't prepay — meet, check the item, then pay",
          vi: 'Không trả trước — gặp mặt, kiểm tra hàng rồi mới trả',
        },
      },
      { id: 'c', text: { ko: '보증금을 두 배로 보낸다', en: 'Send double as a deposit', vi: 'Gửi gấp đôi tiền đặt cọc' } },
    ],
    answer: 'b',
    explanation: {
      ko: '모르는 사람에게 선입금·보증금을 보내지 마세요. 직접 보고 거래하는 게 가장 안전해요.',
      en: 'Never prepay or send deposits to strangers. Seeing the item in person is safest.',
      vi: 'Đừng trả trước hay đặt cọc cho người lạ. Xem hàng trực tiếp là an toàn nhất.',
    },
  },
  {
    id: 'q02',
    question: {
      ko: '중고거래로 직접 만날 때 어디가 가장 좋을까요?',
      en: 'Where is the best place to meet for a marketplace trade?',
      vi: 'Nơi nào tốt nhất để gặp nhau khi mua bán đồ cũ?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '사람이 없는 어두운 골목', en: 'An empty, dark alley', vi: 'Một con hẻm vắng và tối' },
      },
      {
        id: 'b',
        text: { ko: '처음 보는 사람의 집 안', en: "A stranger's apartment", vi: 'Trong nhà của người lạ' },
      },
      {
        id: 'c',
        text: {
          ko: '카페·역 앞처럼 사람이 많은 공공장소',
          en: 'A busy public place like a café or station',
          vi: 'Nơi công cộng đông người như quán cà phê hay nhà ga',
        },
      },
    ],
    answer: 'c',
    explanation: {
      ko: '낮 시간, 사람이 많은 공공장소에서 만나면 훨씬 안전해요.',
      en: 'Meeting in a busy public place during the day is much safer.',
      vi: 'Gặp ở nơi công cộng đông người vào ban ngày sẽ an toàn hơn nhiều.',
    },
  },
  {
    id: 'q03',
    question: {
      ko: '내 중고거래 물건이 팔렸어요. 다음에 할 일은?',
      en: 'Your marketplace item just sold. What should you do next?',
      vi: 'Món đồ bạn đăng bán đã bán xong. Bạn nên làm gì tiếp theo?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '글을 "판매완료"로 바꾼다', en: 'Mark the post as "Sold"', vi: 'Chuyển bài đăng sang "Đã bán"' },
      },
      { id: 'b', text: { ko: '그대로 둔다', en: 'Leave it as is', vi: 'Để nguyên như cũ' } },
      {
        id: 'c',
        text: { ko: '같은 글을 하나 더 올린다', en: 'Post the same item again', vi: 'Đăng lại món đồ đó thêm lần nữa' },
      },
    ],
    answer: 'a',
    explanation: {
      ko: '판매완료로 바꾸면 다른 사람이 헛걸음하지 않아요.',
      en: 'Marking it sold saves other people from asking about it.',
      vi: 'Chuyển sang "Đã bán" giúp người khác không phải hỏi vô ích.',
    },
  },
  {
    id: 'q04',
    question: {
      ko: '중고거래·하우징 글에 대해 궁금한 게 있으면 어떻게 물어볼 수 있나요?',
      en: 'How can you ask about a marketplace or housing post?',
      vi: 'Bạn có thể hỏi về một bài mua bán hoặc nhà ở bằng cách nào?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '글쓴이 집에 찾아간다', en: "Go to the author's home", vi: 'Đến nhà người đăng' },
      },
      {
        id: 'b',
        text: {
          ko: '글의 문의하기로 미생 안에서 대화한다',
          en: "Use the post's inquiry chat inside Misaeng",
          vi: 'Dùng tính năng nhắn hỏi của bài đăng ngay trong Misaeng',
        },
      },
      {
        id: 'c',
        text: { ko: '물어볼 방법이 없다', en: "There's no way to ask", vi: 'Không có cách nào để hỏi' },
      },
    ],
    answer: 'b',
    explanation: {
      ko: '문의하기 대화로 연락처를 공개하지 않고도 물어볼 수 있어요.',
      en: 'The inquiry chat lets you ask without sharing your contact details.',
      vi: 'Nhắn hỏi giúp bạn liên hệ mà không cần công khai thông tin cá nhân.',
    },
  },
  {
    id: 'q05',
    question: {
      ko: '질문·자유 게시판의 익명 글에는 작성자 정보가 어떻게 보이나요?',
      en: 'What do anonymous posts on the Q&A · Free board show about the author?',
      vi: 'Bài ẩn danh trên bảng Hỏi đáp · Tự do hiển thị gì về người viết?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '닉네임과 학교 이름 전부', en: 'Their nickname and school name', vi: 'Biệt danh và tên trường' },
      },
      { id: 'b', text: { ko: '이메일 주소', en: 'Their email address', vi: 'Địa chỉ email' } },
      {
        id: 'c',
        text: {
          ko: '인증 종류(학생·직장인 인증·학부모)만',
          en: 'Only the badge kind (Student, Verified worker, Parent)',
          vi: 'Chỉ loại huy hiệu (Sinh viên, Đã xác minh đi làm, Phụ huynh)',
        },
      },
    ],
    answer: 'c',
    explanation: {
      ko: '익명 글은 닉네임·학교 이름 없이 인증 종류만 보여요.',
      en: 'Anonymous posts show only the badge kind — never the nickname or school.',
      vi: 'Bài ẩn danh chỉ hiện loại huy hiệu, không bao giờ hiện biệt danh hay tên trường.',
    },
  },
  {
    id: 'q06',
    question: {
      ko: '면접·취업 후기를 쓸 때 해도 괜찮은 것은?',
      en: 'When writing an interview or job review, which is okay?',
      vi: 'Khi viết review phỏng vấn hoặc việc làm, điều nào là được?',
    },
    options: [
      {
        id: 'a',
        text: {
          ko: '면접관의 실명과 연락처를 적는다',
          en: "Write the interviewer's full name and phone number",
          vi: 'Ghi tên thật và số điện thoại của người phỏng vấn',
        },
      },
      {
        id: 'b',
        text: {
          ko: '내 경험과 과정을 적는다',
          en: 'Share my own experience and the process',
          vi: 'Chia sẻ trải nghiệm và quy trình của chính mình',
        },
      },
      {
        id: 'c',
        text: {
          ko: '다른 지원자의 개인정보를 올린다',
          en: "Post another applicant's personal info",
          vi: 'Đăng thông tin cá nhân của ứng viên khác',
        },
      },
    ],
    answer: 'b',
    explanation: {
      ko: '후기에는 내 경험만! 다른 사람의 개인정보는 적지 않아요.',
      en: 'Reviews are about your own experience — no one else\'s personal info.',
      vi: 'Review chỉ nói về trải nghiệm của bạn, không có thông tin cá nhân của người khác.',
    },
  },
  {
    id: 'q07',
    question: {
      ko: '비자 게시판의 글은 어떻게 받아들이면 될까요?',
      en: 'How should you treat posts on the visa board?',
      vi: 'Bạn nên hiểu các bài trên bảng visa như thế nào?',
    },
    options: [
      {
        id: 'a',
        text: {
          ko: '다른 사람의 경험담 (법률 자문이 아님)',
          en: "Other people's experiences, not legal advice",
          vi: 'Kinh nghiệm của người khác, không phải tư vấn pháp lý',
        },
      },
      {
        id: 'b',
        text: { ko: '변호사의 공식 법률 자문', en: "A lawyer's official legal advice", vi: 'Tư vấn pháp lý chính thức của luật sư' },
      },
      {
        id: 'c',
        text: { ko: '정부의 공식 발표', en: 'An official government notice', vi: 'Thông báo chính thức của chính phủ' },
      },
    ],
    answer: 'a',
    explanation: {
      ko: '비자 글은 경험 공유예요. 중요한 결정은 학교 담당자나 변호사와 확인하세요.',
      en: 'Visa posts are shared experiences. Check important decisions with your school or a lawyer.',
      vi: 'Bài visa là chia sẻ kinh nghiệm. Hãy hỏi trường hoặc luật sư trước khi quyết định điều quan trọng.',
    },
  },
  {
    id: 'q08',
    question: {
      ko: '미생 포인트로 할 수 있는 것은?',
      en: 'What can you use Misaeng points for?',
      vi: 'Bạn có thể dùng điểm Misaeng để làm gì?',
    },
    options: [
      { id: 'a', text: { ko: '현금으로 바꾸기', en: 'Exchange them for cash', vi: 'Đổi ra tiền mặt' } },
      {
        id: 'b',
        text: { ko: '커피챗 신청, 커리어 질문 보내기', en: 'Request coffee chats and send career questions', vi: 'Đăng ký coffee chat và gửi câu hỏi nghề nghiệp' },
      },
      { id: 'c', text: { ko: '월세 내기', en: 'Pay your rent', vi: 'Trả tiền thuê nhà' } },
    ],
    answer: 'b',
    explanation: {
      ko: '포인트는 커피챗·커리어 질문 같은 미생 기능에 써요.',
      en: 'Points are for Misaeng features like coffee chats and career questions.',
      vi: 'Điểm dùng cho các tính năng của Misaeng như coffee chat và câu hỏi nghề nghiệp.',
    },
  },
  {
    id: 'q09',
    question: {
      ko: '커피챗 신청에는 몇 포인트가 필요할까요?',
      en: 'How many points does a coffee chat request take?',
      vi: 'Đăng ký một buổi coffee chat cần bao nhiêu điểm?',
    },
    options: [
      { id: 'a', text: { ko: '1P', en: '1P', vi: '1P' } },
      { id: 'b', text: { ko: '10,000P', en: '10,000P', vi: '10.000P' } },
      { id: 'c', text: { ko: '120P', en: '120P', vi: '120P' } },
    ],
    answer: 'c',
    explanation: {
      ko: '커피챗은 120P예요. 성사되지 않으면 포인트는 돌려받아요.',
      en: "A coffee chat is 120P, and you get it back if the chat doesn't happen.",
      vi: 'Coffee chat cần 120P, và bạn được hoàn lại nếu buổi trò chuyện không diễn ra.',
    },
  },
  {
    id: 'q10',
    question: {
      ko: '커리어 질문은 한 개에 몇 포인트일까요?',
      en: 'How many points is one career question?',
      vi: 'Một câu hỏi nghề nghiệp tốn bao nhiêu điểm?',
    },
    options: [
      { id: 'a', text: { ko: '30P', en: '30P', vi: '30P' } },
      { id: 'b', text: { ko: '3,000P', en: '3,000P', vi: '3.000P' } },
      { id: 'c', text: { ko: '무제한 무료', en: 'Free, unlimited', vi: 'Miễn phí, không giới hạn' } },
    ],
    answer: 'a',
    explanation: {
      ko: '질문 하나에 30P, 한 번에 3개까지 보낼 수 있어요. 답을 못 받으면 돌려받아요.',
      en: "30P per question, up to 3 at once — refunded if it isn't answered.",
      vi: 'Mỗi câu 30P, tối đa 3 câu một lần — được hoàn lại nếu không có trả lời.',
    },
  },
  {
    id: 'q11',
    question: {
      ko: '미생 포인트는 현금인가요?',
      en: 'Are Misaeng points cash?',
      vi: 'Điểm Misaeng có phải là tiền mặt không?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '네, 은행으로 출금할 수 있어요', en: 'Yes, you can withdraw them to a bank', vi: 'Có, có thể rút về ngân hàng' },
      },
      {
        id: 'b',
        text: {
          ko: '아니요, 미생 안에서만 쓰는 포인트예요',
          en: 'No, they are only for use inside Misaeng',
          vi: 'Không, điểm chỉ dùng trong Misaeng',
        },
      },
      { id: 'c', text: { ko: '네, 가게에서 쓸 수 있어요', en: 'Yes, shops accept them', vi: 'Có, cửa hàng nhận điểm' } },
    ],
    answer: 'b',
    explanation: {
      ko: '포인트는 현금이 아니고 사고팔 수 없어요.',
      en: "Points aren't cash and can't be bought or sold.",
      vi: 'Điểm không phải tiền mặt và không thể mua bán.',
    },
  },
  {
    id: 'q12',
    question: {
      ko: '불쾌하거나 규칙에 어긋나는 글을 봤어요. 어떻게 할까요?',
      en: 'You see a post that is offensive or breaks the rules. What do you do?',
      vi: 'Bạn thấy một bài viết xúc phạm hoặc vi phạm quy định. Bạn làm gì?',
    },
    options: [
      { id: 'a', text: { ko: '욕으로 댓글을 단다', en: 'Reply with insults', vi: 'Bình luận chửi lại' } },
      { id: 'b', text: { ko: '신고하기를 누른다', en: 'Tap Report', vi: 'Nhấn Báo cáo' } },
      {
        id: 'c',
        text: { ko: '캡처해서 여기저기 퍼뜨린다', en: 'Screenshot it and spread it around', vi: 'Chụp màn hình và lan truyền khắp nơi' },
      },
    ],
    answer: 'b',
    explanation: {
      ko: '신고하면 미생 팀이 확인해요. 여러 명이 신고한 글은 자동으로 가려져요.',
      en: 'Reports go to the Misaeng team, and posts reported by several people are hidden automatically.',
      vi: 'Báo cáo sẽ được đội Misaeng xem xét; bài bị nhiều người báo cáo sẽ tự động bị ẩn.',
    },
  },
  {
    id: 'q13',
    question: {
      ko: '특정 사용자의 글을 더 이상 보고 싶지 않다면?',
      en: "You don't want to see a certain user's posts anymore. What can you do?",
      vi: 'Bạn không muốn xem bài của một người dùng nào đó nữa. Bạn có thể làm gì?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '앱을 지운다', en: 'Delete the app', vi: 'Xoá ứng dụng' },
      },
      {
        id: 'b',
        text: { ko: '그 사람을 차단한다', en: 'Block that user', vi: 'Chặn người dùng đó' },
      },
      {
        id: 'c',
        text: { ko: '계정을 새로 하나 더 만든다', en: 'Make another account', vi: 'Tạo thêm một tài khoản khác' },
      },
    ],
    answer: 'b',
    explanation: {
      ko: '차단하면 그 사람의 글과 댓글이 나에게 보이지 않아요.',
      en: "Blocking hides that person's posts and comments from you.",
      vi: 'Chặn sẽ ẩn bài viết và bình luận của người đó khỏi bạn.',
    },
  },
  {
    id: 'q14',
    question: {
      ko: '학교 이메일로 인증하면 글 옆에 어떤 배지가 붙나요?',
      en: 'What badge appears next to your posts after school email verification?',
      vi: 'Sau khi xác minh bằng email trường, huy hiệu nào hiện bên cạnh bài viết của bạn?',
    },
    options: [
      { id: 'a', text: { ko: '학교 이름 배지', en: 'A school name badge', vi: 'Huy hiệu tên trường' } },
      { id: 'b', text: { ko: '아무 배지도 없어요', en: 'No badge at all', vi: 'Không có huy hiệu nào' } },
      { id: 'c', text: { ko: '"VIP" 배지', en: 'A "VIP" badge', vi: 'Huy hiệu "VIP"' } },
    ],
    answer: 'a',
    explanation: {
      ko: '학교 인증을 하면 이름 있는 글에 학교 이름 배지가 보여요.',
      en: 'After school verification, your named posts show your school badge.',
      vi: 'Sau khi xác minh trường, các bài có tên của bạn sẽ hiện huy hiệu trường.',
    },
  },
  {
    id: 'q15',
    question: {
      ko: '직장 인증이 승인되면 어떤 배지가 붙나요?',
      en: 'What badge do you get when your workplace verification is approved?',
      vi: 'Khi xác minh nơi làm việc được duyệt, bạn nhận huy hiệu gì?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '회사 이름과 연봉 배지', en: 'A badge with company name and salary', vi: 'Huy hiệu có tên công ty và mức lương' },
      },
      {
        id: 'b',
        text: { ko: '"직장인 인증" 배지', en: 'A "Verified worker" badge', vi: 'Huy hiệu "Đã xác minh đi làm"' },
      },
      { id: 'c', text: { ko: '"학부모" 배지', en: 'A "Parent" badge', vi: 'Huy hiệu "Phụ huynh"' } },
    ],
    answer: 'b',
    explanation: {
      ko: '직장 인증은 회사 이름 없이 "직장인 인증" 배지로만 보여요.',
      en: 'Workplace verification shows a "Verified worker" badge without the company name.',
      vi: 'Xác minh nơi làm việc chỉ hiện huy hiệu "Đã xác minh đi làm", không hiện tên công ty.',
    },
  },
  {
    id: 'q16',
    question: {
      ko: '글이 바로 공개되는 가장 빠른 인증 방법은?',
      en: 'Which verification makes your posts public right away?',
      vi: 'Cách xác minh nào giúp bài viết được công khai ngay lập tức?',
    },
    options: [
      {
        id: 'a',
        text: { ko: '학교 이메일 인증', en: 'School email verification', vi: 'Xác minh email trường' },
      },
      {
        id: 'b',
        text: { ko: '직장 서류 제출 (승인 후 공개)', en: 'Workplace documents (public after approval)', vi: 'Nộp giấy tờ công việc (công khai sau khi duyệt)' },
      },
      { id: 'c', text: { ko: '인증하지 않기', en: 'Not verifying at all', vi: 'Không xác minh gì cả' } },
    ],
    answer: 'a',
    explanation: {
      ko: '학교 인증은 바로 공개, 직장 인증 글은 미생 팀 승인 후 공개돼요.',
      en: 'School verification is instant; posts made under workplace verification go public after the team approves.',
      vi: 'Xác minh trường có hiệu lực ngay; bài viết khi xác minh nơi làm việc sẽ công khai sau khi đội ngũ duyệt.',
    },
  },
  {
    id: 'q17',
    question: {
      ko: '학부모 계정은 어떻게 만들 수 있나요?',
      en: 'How is a parent account created?',
      vi: 'Tài khoản phụ huynh được tạo như thế nào?',
    },
    options: [
      {
        id: 'a',
        text: {
          ko: '인증된 학생이 보낸 초대 링크로 가입한다',
          en: 'By signing up through an invite link from a verified student',
          vi: 'Đăng ký qua liên kết mời của một sinh viên đã xác minh',
        },
      },
      {
        id: 'b',
        text: { ko: '아무나 학부모라고 적으면 된다', en: 'Anyone can just type "parent"', vi: 'Ai cũng có thể ghi "phụ huynh"' },
      },
      {
        id: 'c',
        text: { ko: '학부모 계정은 없다', en: "Parent accounts don't exist", vi: 'Không có tài khoản phụ huynh' },
      },
    ],
    answer: 'a',
    explanation: {
      ko: '학부모 계정은 인증된 학생의 초대 링크로만 만들고, 학생 계정과 연결돼요.',
      en: "Parent accounts come only from a verified student's invite link and are linked to that student.",
      vi: 'Tài khoản phụ huynh chỉ được tạo qua liên kết mời của sinh viên đã xác minh và được liên kết với sinh viên đó.',
    },
  },
  {
    id: 'q18',
    question: {
      ko: '학부모 계정은 어느 게시판에 글을 쓸 수 있나요?',
      en: 'Which board can parent accounts post on?',
      vi: 'Tài khoản phụ huynh có thể đăng bài ở bảng nào?',
    },
    options: [
      { id: 'a', text: { ko: '중고거래 (판매)', en: 'Marketplace (selling)', vi: 'Mua bán (đăng bán)' } },
      { id: 'b', text: { ko: '면접·취업 후기', en: 'Interview & job reviews', vi: 'Review phỏng vấn & việc làm' } },
      { id: 'c', text: { ko: '질문·자유', en: 'Q&A · Free', vi: 'Hỏi đáp · Tự do' } },
    ],
    answer: 'c',
    explanation: {
      ko: '학부모는 질문·자유에 글을 쓰고, 모든 게시판에 댓글을 달 수 있어요.',
      en: 'Parents can post on Q&A · Free and comment on every board.',
      vi: 'Phụ huynh có thể đăng bài ở Hỏi đáp · Tự do và bình luận ở mọi bảng.',
    },
  },
  {
    id: 'q19',
    question: {
      ko: '미생 계정은 몇 개까지 만들어도 될까요?',
      en: 'How many Misaeng accounts may one person have?',
      vi: 'Mỗi người được có bao nhiêu tài khoản Misaeng?',
    },
    options: [
      { id: 'a', text: { ko: '한 사람당 한 계정', en: 'One account per person', vi: 'Mỗi người một tài khoản' } },
      { id: 'b', text: { ko: '원하는 만큼 많이', en: 'As many as you like', vi: 'Bao nhiêu cũng được' } },
      {
        id: 'c',
        text: { ko: '친구 이름으로도 만들어도 돼요', en: "Also some in friends' names", vi: 'Có thể tạo thêm bằng tên bạn bè' },
      },
    ],
    answer: 'a',
    explanation: {
      ko: '한 사람은 한 계정만! 가짜·중복 계정은 제재될 수 있어요.',
      en: 'One person, one account — fake or duplicate accounts can be suspended.',
      vi: 'Mỗi người một tài khoản — tài khoản giả hoặc trùng lặp có thể bị khoá.',
    },
  },
  {
    id: 'q20',
    question: {
      ko: '댓글로 의견이 다를 때 어떻게 하면 좋을까요?',
      en: 'You disagree with someone in the comments. What should you do?',
      vi: 'Bạn không đồng ý với ai đó trong bình luận. Bạn nên làm gì?',
    },
    options: [
      { id: 'a', text: { ko: '욕설로 대응한다', en: 'Respond with swearing', vi: 'Đáp trả bằng lời lẽ thô tục' } },
      {
        id: 'b',
        text: { ko: '상대의 개인정보를 공개한다', en: "Post the other person's personal info", vi: 'Công khai thông tin cá nhân của người kia' },
      },
      {
        id: 'c',
        text: { ko: '존중하는 말투로 내 의견을 말한다', en: 'Share your view respectfully', vi: 'Nói ý kiến của mình một cách tôn trọng' },
      },
      { id: 'd', text: { ko: '같은 댓글을 여러 번 단다', en: 'Post the same comment many times', vi: 'Đăng cùng một bình luận nhiều lần' } },
    ],
    answer: 'c',
    explanation: {
      ko: '서로 존중하는 말투가 미생의 기본 규칙이에요.',
      en: 'Respectful language is a basic Misaeng rule.',
      vi: 'Lời lẽ tôn trọng là quy tắc cơ bản của Misaeng.',
    },
  },
]

export function getQuizQuestion(id: string): OnboardingQuizQuestion | null {
  return ONBOARDING_QUIZ_QUESTIONS.find((item) => item.id === id) ?? null
}

export function isQuizAnswerCorrect(questionId: string, optionId: string): boolean {
  const question = getQuizQuestion(questionId)
  return Boolean(question && question.answer === optionId)
}

export type LocalizedQuiz = {
  version: string
  questions: { id: string; question: string; options: { id: string; text: string }[] }[]
}

/** Questions in one language, without answers or explanations (the server reveals those per answer). */
export function localizeQuiz(locale: QuizLocale): LocalizedQuiz {
  return {
    version: ONBOARDING_QUIZ_VERSION,
    questions: ONBOARDING_QUIZ_QUESTIONS.map((item) => ({
      id: item.id,
      question: item.question[locale],
      options: item.options.map((option) => ({ id: option.id, text: option.text[locale] })),
    })),
  }
}
