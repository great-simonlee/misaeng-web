import type { CommunityGuestAuthor, CommunityPost } from '@/types/nyc'

/** 가입 없이 남기는 취업 후기 — 게스트 연락처 규칙 (클라이언트·서버 공용) */

export const GUEST_NICKNAME_MIN = 2
export const GUEST_NICKNAME_MAX = 20

/** 게스트 후기 작성 페이지 경로 (도시 prefix 제외) */
export const JOB_REVIEW_GUEST_WRITE_PATH = '/job-review/share'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidGuestEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length <= 254 && EMAIL_RE.test(trimmed)
}

export function normalizeGuestEmail(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
}

/**
 * LinkedIn 프로필 URL 정규화. `linkedin.com/in/...`(스킴·www 생략 허용)만 통과.
 * 통과하지 못하면 null.
 */
export function normalizeLinkedinUrl(
  value: string | null | undefined,
): string | null {
  let raw = String(value || '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
  const path = url.pathname.replace(/\/+$/, '')
  if (!/^\/in\/[^/]{2,}$/i.test(path) && !/^\/pub\/[^/]+/i.test(path)) {
    return null
  }
  return `https://www.linkedin.com${path}`
}

export function isValidLinkedinUrl(value: string): boolean {
  return normalizeLinkedinUrl(value) !== null
}

export function normalizeGuestNickname(
  value: string | null | undefined,
): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GUEST_NICKNAME_MAX)
}

export function isValidGuestNickname(value: string): boolean {
  const nickname = normalizeGuestNickname(value)
  return (
    nickname.length >= GUEST_NICKNAME_MIN &&
    nickname.length <= GUEST_NICKNAME_MAX &&
    !nickname.includes('@')
  )
}

function asTimestamp(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

/** 저장소에서 읽은 guestAuthor 정규화 — 형식이 맞지 않으면 null */
export function normalizeCommunityGuestAuthor(
  raw: unknown,
): CommunityGuestAuthor | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const nickname = normalizeGuestNickname(
    typeof data.nickname === 'string' ? data.nickname : '',
  )
  const email = normalizeGuestEmail(
    typeof data.email === 'string' ? data.email : '',
  )
  const linkedinUrl =
    typeof data.linkedinUrl === 'string' ? data.linkedinUrl.trim() : ''
  // 공개 응답(비공개 필드가 지워진 형태)도 정규화를 통과해야 한다.
  if (!nickname && !email && !linkedinUrl) return null

  const linkedBy =
    data.linkedBy === 'self' || data.linkedBy === 'admin'
      ? data.linkedBy
      : null
  const linkedUid =
    typeof data.linkedUid === 'string' && data.linkedUid.trim()
      ? data.linkedUid.trim()
      : null

  return {
    nickname,
    email,
    linkedinUrl: normalizeLinkedinUrl(linkedinUrl) ?? linkedinUrl,
    coffeeChatOk: data.coffeeChatOk === true,
    guidelinesVersion:
      typeof data.guidelinesVersion === 'string' && data.guidelinesVersion.trim()
        ? data.guidelinesVersion.trim()
        : null,
    linkedUid,
    linkedAt: linkedUid ? asTimestamp(data.linkedAt) : null,
    linkedBy: linkedUid ? linkedBy : null,
    linkedByEmail:
      linkedUid && typeof data.linkedByEmail === 'string' && data.linkedByEmail.trim()
        ? data.linkedByEmail.trim()
        : null,
  }
}

/** 아직 계정에 연결되지 않은 게스트 글 */
export function isUnlinkedGuestCommunityPost(
  post: Pick<CommunityPost, 'authorUid' | 'guestAuthor'>,
): boolean {
  return Boolean(post.guestAuthor) && !String(post.authorUid || '').trim()
}

/** 가입 없이 작성된 글(연결 여부 무관) */
export function isGuestAuthoredCommunityPost(
  post: Pick<CommunityPost, 'guestAuthor'>,
): boolean {
  return Boolean(post.guestAuthor)
}

/**
 * 공개 응답용 — 게스트의 이메일·LinkedIn은 작성자 본인(연결된 계정)에게만 보인다.
 * 나머지(닉네임·커피챗 여부·연결 여부)는 그대로 둔다.
 */
export function sanitizeGuestAuthorForViewer<T extends Pick<CommunityPost, 'authorUid' | 'guestAuthor'>>(
  post: T,
  viewerUid?: string | null,
): T {
  const guest = post.guestAuthor
  if (!guest) return post
  const isOwner = Boolean(
    viewerUid && post.authorUid && viewerUid === post.authorUid,
  )
  if (isOwner) return post
  return {
    ...post,
    guestAuthor: {
      ...guest,
      email: '',
      linkedinUrl: '',
      linkedByEmail: null,
    },
  }
}
