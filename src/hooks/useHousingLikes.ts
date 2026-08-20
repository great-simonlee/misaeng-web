'use client'

import { useMemo, useSyncExternalStore } from 'react'

import {
  getLikedHousingIds,
  subscribeHousingLikes,
  toggleHousingLike,
} from '@lib/utils/housingLikes'

function getSnapshot() {
  return getLikedHousingIds().join('|')
}

function getServerSnapshot() {
  return ''
}

export function useHousingLikes() {
  const snapshot = useSyncExternalStore(
    subscribeHousingLikes,
    getSnapshot,
    getServerSnapshot,
  )
  const likedIds = useMemo(
    () => (snapshot ? snapshot.split('|').filter(Boolean) : []),
    [snapshot],
  )

  return {
    likedIds,
    isLiked: (postId: string) => likedIds.includes(postId),
    toggleLike: (postId: string) => toggleHousingLike(postId),
  }
}

export function useHousingLike(postId: string) {
  const { isLiked, toggleLike } = useHousingLikes()

  return {
    liked: isLiked(postId),
    toggle: () => {
      toggleLike(postId)
    },
  }
}
