/**
 * 팀이 대신 올린 면접/취업 후기 (예: 중국 유학생에게 받은 후기를 번역해 ellieo-erp에서 등록).
 * 계정이 없는 작성자라 authorUid가 비어 있고 guestAuthor도 없다 — 이메일로 연결(claim)되지 않고,
 * 커피챗·커리어 질문은 받을 수 없다 (둘 다 authorUid가 있어야 열린다).
 * 닉네임은 글마다 새로 뽑고(영어) 회원 닉네임과 같은 색인으로 중복을 막는다.
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

/**
 * Member nickname rule (English letters and ".", 3–20) — no digits or spaces. Since 2026-11-25 nicknames are
 * English only for both Misaeng and Ellieo, so a Korean review gets an English nickname too (the language
 * parameter stays for the ERP request shape).
 */
const WORDS = {
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
}

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}

/** 랜덤 후보 하나 (중복 확인은 호출하는 쪽에서) */
export function randomProxyNickname(): string {
  return `${pick(WORDS.adjectives)}${pick(WORDS.nouns)}`
}

export function isProxyNicknameLanguage(value: unknown): value is ProxyNicknameLanguage {
  return value === 'ko' || value === 'en'
}
