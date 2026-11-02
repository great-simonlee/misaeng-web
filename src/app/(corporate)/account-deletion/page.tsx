import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '미생 계정 삭제 안내 · Misaeng account deletion',
  description: '미생(Misaeng) 앱·웹 계정과 데이터를 삭제하는 방법, 삭제되는 정보와 보관되는 정보 안내.',
  alternates: { canonical: 'https://misaeng.com/account-deletion' },
}

/**
 * Public account deletion page for app stores (Google Play "Delete account URL"):
 * no sign-in needed, names the app, shows the steps, and what is deleted or kept and for how long.
 * Keep in sync with the in-app deletion flow (DELETE /api/app/me) and the privacy policy §9.
 */
export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14 text-slate-800">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#F64310]">MISAENG</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">미생 계정 삭제 안내</h1>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">
        미생(Misaeng) 앱과 misaeng.com은 같은 계정을 써요. 아래 방법 중 하나로 언제든 계정과 데이터를 삭제할 수 있어요.
      </p>

      <Section title="1. 앱에서 삭제 (iPhone · Android)">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>미생 앱 홈 오른쪽 위 프로필 버튼을 눌러 마이페이지로 가요.</li>
          <li>맨 아래 <b>회원 탈퇴</b>를 눌러요.</li>
          <li>삭제되는 내용을 확인하고(탈퇴 사유는 선택) <b>탈퇴하기</b>를 눌러요.</li>
        </ol>
      </Section>

      <Section title="2. 웹에서 삭제">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <a className="font-semibold text-[#F64310] underline" href="https://misaeng.com/nyc/me">
              misaeng.com
            </a>
            에 로그인해요.
          </li>
          <li>마이페이지 맨 아래 <b>회원 탈퇴</b>를 눌러 확인해요.</li>
        </ol>
      </Section>

      <Section title="3. 로그인할 수 없을 때">
        <p>
          가입한 이메일 주소로{' '}
          <a className="font-semibold text-[#F64310] underline" href="mailto:info@misaeng.com?subject=%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD">
            info@misaeng.com
          </a>
          에 “계정 삭제 요청”을 보내 주세요. 본인 확인 후 영업일 기준 7일 안에 처리해요.
        </p>
      </Section>

      <Section title="바로 삭제되는 정보">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>프로필(닉네임, 이름, 사진, MBTI, 성별, 직업)과 로그인 정보</li>
          <li>학교·직장·인스타그램 인증 정보, 제출한 인증 서류</li>
          <li>알림 내역, 푸시 알림 기기 정보, 저장(찜) 목록</li>
          <li>룸메이트·서블렛 글, 커피챗 멘토 등록 정보</li>
        </ul>
      </Section>

      <Section title="남거나 일정 기간 보관되는 정보">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>다른 게시판 글과 댓글은 작성자가 “탈퇴한 회원”으로 바뀌어 남아요(탈퇴 전에 직접 삭제할 수 있어요).</li>
          <li>신고·제재 기록과 부정 이용 방지 기록: 분쟁·보안 대응에 필요한 기간</li>
          <li>뉴욕주 면허 중개 활동 관련 기록(문의·쇼잉·신청 기록 등): 법에 따라 최소 3년</li>
          <li>포인트 거래 기록 등 회계·법적 보관이 필요한 기록: 관련 법령이 정한 기간</li>
          <li>백업 데이터: 정해진 백업 주기에 따라 순차적으로 삭제</li>
        </ul>
        <p className="mt-3 text-[13px] text-slate-500">
          자세한 내용은{' '}
          <a className="underline" href="https://misaeng.com/nyc/privacy-policy">
            개인정보처리방침
          </a>{' '}
          9항(보유 및 삭제)을 참고해 주세요. 같은 계정을 쓰는 Ellieo 계정도 함께 삭제돼요.
        </p>
      </Section>

      <Section title="계정은 두고 일부 데이터만 삭제하려면">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>내 글·댓글: 각 글의 ··· 메뉴에서 수정·삭제</li>
          <li>인증 서류: 마이페이지 → 인증 내역 → 지금 삭제</li>
          <li>프로필 정보: 마이페이지 → 개인 정보에서 수정·삭제</li>
          <li>그 밖의 요청: info@misaeng.com</li>
        </ul>
      </Section>

      <hr className="my-12 border-slate-200" />

      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Delete your Misaeng account</h2>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">
        The Misaeng app and misaeng.com share one account. You can delete it at any time:
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-7">
        <li>
          <b>In the app</b>: profile button (top right of Home) → My page → <b>회원 탈퇴 (Delete account)</b> at the
          bottom → confirm.
        </li>
        <li>
          <b>On the web</b>: sign in at misaeng.com → My page → <b>회원 탈퇴</b>.
        </li>
        <li>
          <b>Can’t sign in?</b> Email <a className="underline" href="mailto:info@misaeng.com">info@misaeng.com</a> from
          your account email; we handle it within 7 business days.
        </li>
      </ul>
      <p className="mt-4 text-[15px] leading-7">
        <b>Deleted right away</b>: profile and sign-in data, school/work/Instagram verifications and uploaded documents,
        notifications and push devices, saved items, roommate/sublet posts, coffee-chat mentor profile.
      </p>
      <p className="mt-3 text-[15px] leading-7">
        <b>Kept</b>: other posts and comments remain under “Deleted member”; report and safety records for as long as
        needed for disputes and security; New York licensed brokerage records for at least 3 years as required by law;
        point and accounting records as required by law; backups are purged on their regular cycle. See the{' '}
        <a className="underline" href="https://misaeng.com/nyc/privacy-policy">
          privacy policy
        </a>{' '}
        §9.
      </p>
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
