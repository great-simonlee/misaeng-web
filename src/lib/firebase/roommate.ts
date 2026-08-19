import type { RoommatePost, RoommatePostInput } from '@/types/nyc'

// 임시: 파이어베이스 Roommate 연동 비활성화
// import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from 'firebase/firestore'
// import { getFirebaseDb } from './client'

const DISABLED_MESSAGE =
  'Firebase가 일시적으로 비활성화되어 있어요'

export async function listRoommatePosts(): Promise<RoommatePost[]> {
  return []
}

export async function getRoommatePost(
  _id: string,
): Promise<RoommatePost | null> {
  return null
}

export async function findRoommatePostByAuthor(
  _authorUid: string,
): Promise<RoommatePost | null> {
  return null
}

export async function listRoommatePostsByAuthor(
  _authorUid: string,
): Promise<RoommatePost[]> {
  return []
}

export async function createRoommatePost(
  _input: RoommatePostInput,
  _authorUid: string,
  _authorEmail: string,
  _authorSchool?: { id: string | null; name: string | null },
): Promise<string> {
  throw new Error(DISABLED_MESSAGE)
}

export async function closeRoommatePost(
  _id: string,
  _authorUid: string,
): Promise<void> {
  throw new Error(DISABLED_MESSAGE)
}
