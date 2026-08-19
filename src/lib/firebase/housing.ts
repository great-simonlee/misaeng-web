import type {
  HousingPost,
  HousingPostInput,
} from '@/types/nyc'

// 임시: 파이어베이스 Housing 연동 비활성화
// import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore'
// import { getFirebaseDb } from './client'

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export async function listHousingPosts(): Promise<HousingPost[]> {
  return []
}

export async function listHousingPostsByAuthor(
  _authorUid: string,
): Promise<HousingPost[]> {
  return []
}

export async function getHousingPost(_id: string): Promise<HousingPost | null> {
  return null
}

export async function createHousingPost(
  _input: HousingPostInput,
  _authorUid: string,
  _authorEmail: string,
  _authorSchool?: { id: string | null; name: string | null },
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export async function closeHousingPost(_id: string): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}
