/**
 * 팀이 대신 올린 면접/취업 후기 (예: 중국 유학생에게 받은 후기를 번역해 ellieo-erp에서 등록).
 * 계정이 없는 작성자라 authorUid가 비어 있고 guestAuthor도 없다 — 이메일로 연결(claim)되지 않고,
 * 커피챗·커리어 질문은 받을 수 없다 (둘 다 authorUid가 있어야 열린다).
 * 닉네임은 글마다 새로 뽑고(한글/영어) 회원 닉네임과 같은 색인으로 중복을 막는다.
 */
export type ProxyAuthor = {
  /** 등록한 팀원 이메일 */
  addedBy: string
  addedAt: number
}

export function normalizeProxyAuthor(raw: unknown): ProxyAuthor | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const addedAt = Number(data.addedAt)
  return {
    addedBy: typeof data.addedBy === 'string' ? data.addedBy.trim() : '',
    addedAt: Number.isFinite(addedAt) ? addedAt : 0,
  }
}

export type ProxyNicknameLanguage = 'ko' | 'en'

/** 회원 닉네임 규칙(한글·영문·점, 2–20자)을 지키는 조합만 만든다 — 숫자·공백 없음 */
const WORDS: Record<ProxyNicknameLanguage, { adjectives: string[]; nouns: string[] }> = {
  ko: {
    adjectives: [
      '용감한', '느긋한', '반짝이는', '조용한', '씩씩한', '다정한', '부지런한', '엉뚱한', '차분한', '명랑한',
      '똑똑한', '날쌘', '포근한', '수줍은', '당당한', '상냥한', '든든한', '재빠른', '유쾌한', '꼼꼼한',
      '따뜻한', '활기찬', '침착한', '호기심많은', '성실한', '느릿한', '빛나는', '푸른', '하얀', '노란',
    ],
    nouns: [
      '수달', '판다', '여우', '고래', '펭귄', '다람쥐', '부엉이', '돌고래', '사슴', '토끼',
      '고슴도치', '너구리', '코알라', '알파카', '참새', '거북이', '해달', '두더지', '물개', '햄스터',
      '기린', '코끼리', '앵무새', '오리', '고양이', '강아지', '나무늘보', '캥거루', '독수리', '반딧불',
    ],
  },
  en: {
    adjectives: [
      'Brave', 'Calm', 'Bright', 'Quiet', 'Bold', 'Kind', 'Busy', 'Clever', 'Swift', 'Gentle',
      'Happy', 'Lucky', 'Sunny', 'Witty', 'Cozy', 'Eager', 'Jolly', 'Merry', 'Noble', 'Proud',
      'Rapid', 'Steady', 'Sharp', 'Mellow', 'Breezy', 'Cheery', 'Daring', 'Keen', 'Lively', 'Plucky',
    ],
    nouns: [
      'Otter', 'Panda', 'Fox', 'Whale', 'Penguin', 'Squirrel', 'Owl', 'Dolphin', 'Deer', 'Rabbit',
      'Hedgehog', 'Raccoon', 'Koala', 'Alpaca', 'Sparrow', 'Turtle', 'Mole', 'Seal', 'Hamster', 'Giraffe',
      'Parrot', 'Duck', 'Kitten', 'Puppy', 'Sloth', 'Kangaroo', 'Eagle', 'Firefly', 'Beaver', 'Lynx',
    ],
  },
}

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}

/** 랜덤 후보 하나 (중복 확인은 호출하는 쪽에서) */
export function randomProxyNickname(language: ProxyNicknameLanguage): string {
  const words = WORDS[language]
  return `${pick(words.adjectives)}${pick(words.nouns)}`
}

export function isProxyNicknameLanguage(value: unknown): value is ProxyNicknameLanguage {
  return value === 'ko' || value === 'en'
}
