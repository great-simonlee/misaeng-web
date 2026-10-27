/**
 * Non-AI text similarity for review claims (spec 3.4 "유사도 검사"): word-shingle Jaccard.
 * Texts are lower-cased, punctuation is stripped, and 3-word shingles are compared (single words for very
 * short texts). A score ≥ rule.similarity_threshold (%) keeps the claim but sets hold_reason='similar'.
 */

const SHINGLE = 3

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function shingles(text: string, size = SHINGLE): Set<string> {
  const w = words(text)
  const out = new Set<string>()
  if (w.length < size + 2) {
    for (const word of w) out.add(word)
    return out
  }
  for (let i = 0; i + size <= w.length; i += 1) out.add(w.slice(i, i + size).join(' '))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const s of small) if (large.has(s)) inter += 1
  return inter / (a.size + b.size - inter)
}

/** Highest similarity (0..1) of `text` against `others`, with the id of the closest one. */
export function maxSimilarity(
  text: string,
  others: { id: string; text: string }[],
): { score: number; matchId: string | null } {
  const base = shingles(text)
  // too little text to judge (e.g. photo-only food review)
  if (base.size < 5) return { score: 0, matchId: null }
  let best = { score: 0, matchId: null as string | null }
  for (const other of others) {
    const score = jaccard(base, shingles(other.text))
    if (score > best.score) best = { score, matchId: other.id }
  }
  return best
}
