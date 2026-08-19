'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  getLikedHousingIds,
  isHousingLiked,
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
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    setLiked(isHousingLiked(postId))
    return subscribeHousingLikes(() => {
      setLiked(isHousingLiked(postId))
    })
  }, [postId])

  function toggle() {
    setLiked(toggleHousingLike(postId))
  }

  return { liked, toggle }
}
