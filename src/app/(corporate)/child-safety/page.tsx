import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '미생 아동 안전 정책 · Misaeng child safety standards',
  description: '미생(Misaeng)의 아동 성착취·학대(CSAE) 금지 정책, 신고 방법과 대응 절차, 아동 안전 담당 연락처.',
  alternates: { canonical: 'https://misaeng.com/child-safety' },
}

/**
 * Public child safety standards for app stores (Google Play "Child safety standards" URL):
 * no sign-in needed, names the app, prohibits CSAE/CSAM explicitly, and gives the reporting path and contact.
 * Keep in sync with the in-app report flow and the terms of use (prohibited content, 18+).
 */
export default function ChildSafetyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14 text-slate-800">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#F64310]">MISAENG</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">미생 아동 안전 정책</h1>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">
        미생(Misaeng) 앱과 misaeng.com은 아동 성착취·학대(CSAE)를 절대 허용하지 않아요. 이 정책은 미생의 모든 게시판,
        댓글, 프로필, 사진, 커피챗과 커리어 질문 메시지에 적용돼요.
      </p>

      <Section title="금지하는 행위">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>아동 성착취물(CSAM)을 올리거나, 공유하거나, 요청하거나, 링크하는 행위</li>
          <li>아동을 성적으로 묘사하거나 대상화하는 글·사진·메시지</li>
          <li>아동에게 접근해 성적 목적으로 관계를 만드는 행위(그루밍), 성적 착취를 위한 유인·거래</li>
          <li>아동을 대상으로 한 성적 협박(sextortion), 인신매매, 그 밖의 학대·착취를 돕거나 홍보하는 행위</li>
        </ul>
      </Section>

      <Section title="이용 연령">
        <p>
          미생은 만 18세 이상을 위한 서비스예요. 미성년자는 법정대리인의 동의 없이 가입하거나 글을 쓸 수 없고, 미성년자로
          확인된 계정은 제한될 수 있어요.
        </p>
      </Section>

      <Section title="신고하는 방법">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>앱·웹에서</b>: 글·댓글의 ··· 메뉴, 커피챗·질문 화면의 신고 버튼에서 <b>신고</b>를 눌러요. 상대를 차단할 수도
            있어요.
          </li>
          <li>
            <b>이메일</b>:{' '}
            <a className="font-semibold text-[#F64310] underline" href="mailto:info@misaeng.com?subject=Child%20safety%20report">
              info@misaeng.com
            </a>
            (제목: Child safety report). 문제의 화면 주소나 캡처를 함께 보내 주세요.
          </li>
          <li>아동이 지금 위험하다면 먼저 911(미국) 또는 112(한국)에 신고해 주세요.</li>
        </ul>
      </Section>

      <Section title="미생의 대응">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>신고된 콘텐츠는 운영팀에 바로 알림이 가고, 여러 번 신고되면 검토 전에 자동으로 숨겨져요.</li>
          <li>CSAE·CSAM으로 확인되면 콘텐츠를 즉시 삭제하고, 관련 계정을 사전 통지 없이 영구 정지해요.</li>
          <li>
            미국 법(18 U.S.C. § 2258A)에 따라 NCMEC(National Center for Missing &amp; Exploited Children)
            CyberTipline에 신고하고, 그 밖의 관할 수사기관에도 신고하며 수사에 협조해요.
          </li>
          <li>수사에 필요한 기록은 법이 정한 기간 동안 안전하게 보관해요.</li>
        </ul>
      </Section>

      <Section title="아동 안전 담당 연락처">
        <p>
          Misaeng LLC 아동 안전 담당:{' '}
          <a className="font-semibold text-[#F64310] underline" href="mailto:info@misaeng.com">
            info@misaeng.com
          </a>
          . 아동 안전 관련 문의와 신고는 우선 처리해요.
        </p>
        <p className="mt-3 text-[13px] text-slate-500">
          자세한 금지 콘텐츠와 제재는{' '}
          <a className="underline" href="https://misaeng.com/nyc/terms">
            이용약관
          </a>
          을 참고해 주세요.
        </p>
      </Section>

      <hr className="my-12 border-slate-200" />

      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Misaeng child safety standards</h2>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">
        The Misaeng app and misaeng.com have zero tolerance for child sexual abuse and exploitation (CSAE). These standards
        apply to every board, comment, profile, photo, coffee chat and career question message on Misaeng.
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
        <li>
          <b>Prohibited</b>: uploading, sharing, requesting or linking to child sexual abuse material (CSAM); content that
          sexualizes minors; grooming or soliciting minors; sextortion, trafficking, or promoting any abuse or exploitation
          of children.
        </li>
        <li>
          <b>Age</b>: Misaeng is for users 18 and older. Minors may not register or post without a guardian&rsquo;s
          consent, and accounts found to belong to minors may be restricted.
        </li>
        <li>
          <b>How to report</b>: tap <b>Report</b> in the ··· menu of any post or comment, or on coffee chat and question
          screens; you can also block the user. Or email{' '}
          <a className="underline" href="mailto:info@misaeng.com?subject=Child%20safety%20report">
            info@misaeng.com
          </a>{' '}
          (subject: Child safety report). If a child is in immediate danger, call 911 (US) or local emergency services first.
        </li>
        <li>
          <b>What we do</b>: reports alert our team right away and repeatedly reported content is hidden automatically.
          Confirmed CSAE/CSAM is removed immediately and the accounts involved are permanently banned without notice. We
          report to the NCMEC CyberTipline as required by 18 U.S.C. § 2258A and to other relevant authorities, and cooperate
          with investigations.
        </li>
        <li>
          <b>Child safety contact</b>: Misaeng LLC,{' '}
          <a className="underline" href="mailto:info@misaeng.com">
            info@misaeng.com
          </a>
          . See also our{' '}
          <a className="underline" href="https://misaeng.com/nyc/terms">
            terms of use
          </a>
          .
        </li>
      </ul>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-2 text-[15px] leading-7">{children}</div>
    </section>
  )
}
